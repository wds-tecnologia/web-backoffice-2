export class FormulaParser {
    private data: any[][]
    private cache: Map<string, any>
    private processingStack: Set<string>
  
    constructor(initialData: any[][]) {
      this.data = initialData
      this.cache = new Map()
      this.processingStack = new Set()
    }
  
    /**
     * Update the data source for formula calculations
     */
    updateData(newData: any[][]) {
      this.data = newData
      this.clearCache()
    }
  
    /**
     * Clear the calculation cache
     */
    clearCache() {
      this.cache = new Map()
    }
  
    /**
     * Main formula calculation function
     */
    calculateFormula(formula: string) {
      // Return original value if not a formula
      if (!formula || typeof formula !== "string" || !formula.startsWith("=")) {
        return formula
      }
  
      // Create a cache key based on the formula and cell position
      const cacheKey = formula
  
      // Check for circular references
      if (this.processingStack.has(cacheKey)) {
        throw new Error("Referência circular detectada")
      }
  
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)
      }
  
      // Add to processing stack to detect circular references
      this.processingStack.add(cacheKey)
  
      try {
        // Extract the formula without the = sign and convert to uppercase
        const cleanFormula = formula.substring(1).trim().toUpperCase()
  
        if (!cleanFormula) return ""
  
        let result
  
        // Handle different formula types
        if (cleanFormula.startsWith("DIVIDIR(")) {
          result = this.handleDividir(cleanFormula)
        } else if (cleanFormula.startsWith("MULT(")) {
          result = this.handleMult(cleanFormula)
        } else if (cleanFormula.startsWith("SUB(")) {
          result = this.handleSub(cleanFormula)
        } else if (cleanFormula.startsWith("SE(")) {
          result = this.handleSe(cleanFormula)
        } else if (cleanFormula.startsWith("SOMA(")) {
          result = this.handleSoma(cleanFormula)
        } else if (cleanFormula.startsWith("MÉDIA(") || cleanFormula.startsWith("MEDIA(")) {
          result = this.handleMedia(cleanFormula)
        } else if (cleanFormula.startsWith("PROCV(")) {
          result = this.handleProcv(cleanFormula)
        } else {
          // Direct expressions like =A1+B2*3
          result = this.evaluateCellExpression(cleanFormula)
        }
  
        // Cache the result
        this.cache.set(cacheKey, result)
        return result
      } catch (err) {
        console.error("Erro na fórmula:", err.message)
        throw err
      } finally {
        // Remove from processing stack after calculation
        this.processingStack.delete(cacheKey)
      }
    }
  
    /**
     * Handle DIVIDIR formula
     */
    private handleDividir(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) return formula
  
      const refs = inside.split(";").map((ref) => ref.trim())
      const values = refs.map((ref) => this.evaluateCellExpression(ref))
  
      // Avoid division by zero
      const result = values.reduce((acc, val, index) => {
        if (index === 0) return Number.parseFloat(val) || 0
        return Number.parseFloat(val) !== 0 ? acc / (Number.parseFloat(val) || 1) : acc
      })
  
      return this.formatResult(result, refs)
    }
  
    /**
     * Handle MULT formula
     */
    private handleMult(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) return formula
  
      const refs = inside.split(";").map((ref) => ref.trim())
      const values = refs.map((ref) => this.evaluateCellExpression(ref))
      const product = values.reduce((acc, val) => acc * (Number.parseFloat(val) || 0), 1)
  
      return this.formatResult(product, refs)
    }
  
    /**
     * Handle SUB formula
     */
    private handleSub(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) return formula
  
      const refs = inside.split(";").map((ref) => ref.trim())
      const values = refs.map((ref) => this.evaluateCellExpression(ref))
  
      // First value minus all others
      const result = values.reduce((acc, val, index) => {
        if (index === 0) return Number.parseFloat(val) || 0
        return acc - (Number.parseFloat(val) || 0)
      })
  
      return this.formatResult(result, refs)
    }
  
    /**
     * Handle SE formula
     */
    private handleSe(formula: string) {
      const inside = formula.match(/$$(.*)$$/)?.[1]
      if (!inside) throw new Error("Sintaxe SE inválida")
  
      const [cond, valTrue, valFalse] = inside.split(";").map((s) => s.trim())
      const condEval = this.evaluateCellExpression(cond)
  
      return condEval ? valTrue : valFalse
    }
  
    /**
     * Handle SOMA formula
     */
    private handleSoma(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) return formula
  
      // Handle both range notation (A1:B3) and individual cells (A1;B3)
      if (inside.includes(":")) {
        return this.sumFromRange(inside)
      }
  
      const refs = inside.split(";").map((ref) => ref.trim())
      const values = refs.map((ref) => this.evaluateCellExpression(ref))
      const total = values.reduce((acc, v) => acc + (Number.parseFloat(v) || 0), 0)
  
      return this.formatResult(total, refs)
    }
  
    /**
     * Handle MEDIA/MÉDIA formula
     */
    private handleMedia(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) return formula
  
      // Handle both range notation and individual cells
      if (inside.includes(":")) {
        return this.averageFromRange(inside)
      }
  
      const refs = inside.split(";").map((ref) => ref.trim())
      const values = refs.map((ref) => this.evaluateCellExpression(ref))
      const validValues = values.filter((v) => !isNaN(Number.parseFloat(v)))
  
      if (validValues.length === 0) return 0
  
      const sum = validValues.reduce((acc, v) => acc + (Number.parseFloat(v) || 0), 0)
      return sum / validValues.length
    }
  
    /**
     * Handle PROCV formula
     */
    private handleProcv(formula: string) {
      const inside = formula.match(/$$([^)]+)$$/)?.[1]
      if (!inside) throw new Error("Sintaxe PROCV inválida")
  
      const [lookupValueRaw, rangeRaw, columnIndexRaw] = inside.split(";").map((s) => s.trim())
      const lookupValue = this.evaluateCellExpression(lookupValueRaw)
      const columnIndex = Number.parseInt(columnIndexRaw) - 1
  
      const [startCell, endCell] = rangeRaw.split(":")
      const startCol = startCell.charCodeAt(0) - 65
      const startRow = Number.parseInt(startCell.substring(1)) - 1
      const endCol = endCell.charCodeAt(0) - 65
      const endRow = Number.parseInt(endCell.substring(1)) - 1
  
      for (let row = startRow; row <= endRow; row++) {
        const cellValue = this.data[row]?.[startCol]
        if (String(cellValue).toLowerCase() === String(lookupValue).toLowerCase()) {
          return this.data[row]?.[startCol + columnIndex] || ""
        }
      }
  
      return "Não encontrado"
    }
  
    /**
     * Calculate sum from a range of cells
     */
    private sumFromRange(range: string) {
      const [startCell, endCell] = range.split(":")
      const startRow = Number.parseInt(startCell.substring(1)) - 1
      const startCol = startCell.charCodeAt(0) - 65
      const endRow = Number.parseInt(endCell.substring(1)) - 1
      const endCol = endCell.charCodeAt(0) - 65
  
      let sum = 0
      let allReais = true
      let allDollar = true
  
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellValue = this.data[row]?.[col] || ""
          sum +=
            Number.parseFloat(
              String(cellValue)
                .replace(/[^\d.,-]/g, "")
                .replace(",", "."),
            ) || 0
  
          // Check currency format
          allReais = allReais && String(cellValue).includes("R$")
          allDollar = allDollar && String(cellValue).includes("$") && !String(cellValue).includes("R$")
        }
      }
  
      // Format result based on currency
      if (allReais) return `R$ ${sum.toFixed(2).replace(".", ",")}`
      if (allDollar) return `$ ${sum.toFixed(2).replace(".", ",")}`
  
      return sum
    }
  
    /**
     * Calculate average from a range of cells
     */
    private averageFromRange(range: string) {
      const [startCell, endCell] = range.split(":")
      const startRow = Number.parseInt(startCell.substring(1)) - 1
      const startCol = startCell.charCodeAt(0) - 65
      const endRow = Number.parseInt(endCell.substring(1)) - 1
      const endCol = endCell.charCodeAt(0) - 65
  
      let sum = 0,
        count = 0
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const val = Number.parseFloat(
            String(this.data[row]?.[col] || "")
              .replace(/[^\d.,-]/g, "")
              .replace(",", "."),
          )
          if (!isNaN(val)) {
            sum += val
            count++
          }
        }
      }
  
      return count > 0 ? sum / count : 0
    }
  
    /**
     * Evaluate cell expressions like A1+B2*3
     */
    evaluateCellExpression(expr: string) {
      try {
        // Se a expressão for apenas uma referência de célula (ex: A1), retorna o valor diretamente
        if (/^[A-Z]+[0-9]+$/.test(expr)) {
          const col = expr.charCodeAt(0) - 65
          const row = Number.parseInt(expr.substring(1)) - 1
          let val = this.data[row]?.[col] ?? ""
  
          // Handle nested formulas
          if (typeof val === "string" && val.trim().startsWith("=")) {
            val = this.calculateFormula(val)
          }
  
          return val
        }
  
        const cleanedExpr = expr.replace(/[A-Z]+[0-9]+/g, (match) => {
          const col = match.charCodeAt(0) - 65
          const row = Number.parseInt(match.substring(1)) - 1
          let val = this.data[row]?.[col] ?? ""
  
          // Handle nested formulas
          if (typeof val === "string" && val.trim().startsWith("=")) {
            val = this.calculateFormula(val)
          }
  
          if (typeof val === "string") {
            val = val
              .replace(/[^\d.,-]/g, "") // remove symbols like R$, %, $
              .replace(",", ".")
          }
  
          return Number.parseFloat(val) || 0
        })
  
        // Use Function instead of eval for better security
        return Function('"use strict"; return (' + cleanedExpr + ")")()
      } catch (error) {
        console.error("Error evaluating expression:", error)
        throw new Error(`Expressão inválida: ${expr}`)
      }
    }
  
    /**
     * Format result based on currency detection
     */
    private formatResult(result: number, refs: string[]) {
      const allReais = refs.every((ref) => {
        const col = ref.charCodeAt(0) - 65
        const row = Number.parseInt(ref.substring(1)) - 1
        return String(this.data[row]?.[col] || "").includes("R$")
      })
  
      const allDollar = refs.every((ref) => {
        const col = ref.charCodeAt(0) - 65
        const row = Number.parseInt(ref.substring(1)) - 1
        return String(this.data[row]?.[col] || "").includes("$") && !String(this.data[row]?.[col] || "").includes("R$")
      })
  
      if (allReais) return `R$ ${result.toFixed(2).replace(".", ",")}`
      if (allDollar) return `$ ${result.toFixed(2).replace(".", ",")}`
  
      return result
    }
  }
  