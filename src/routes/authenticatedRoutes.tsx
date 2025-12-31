import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout as BackofficeLayout } from "../pages/backoffice/Layout/base";
import { SignIn as BackofficeSignIn } from "../pages/backoffice/SignIn";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { Logout } from "../pages/backoffice/Logout";
import GuardedRoute from "./GuardedRoute";
import { JSX, useEffect } from "react";
import Dashboard from "../pages/dashboard";
import Team from "../pages/team";
import Contacts from "../pages/contacts";
import Invoices from "../pages/invoices";
import FormGroup from "../pages/form-group";
import FormRoom from "../pages/form-room";
import FormUser from "../pages/form-user";
import SpreadsheetApp from "../pages/spreadsheets";
import { CambioPage } from "../pages/cambiobackoffice/CambioPage";
import InvocesManagement from "../pages/gestao-invoices/InvocesManagement";
import TokensManagement from "../pages/tokens-management/TokensManagement";
import BillsManagement from "../pages/bills-management";
import OperatorsManagement from "../pages/form-operators/OperatorsManagement";
import OperatorManager2 from "../pages/form-operators-two/OperatorsManagement2";
import OperatorManager from "../pages/form-operators/OperatorsManagement";
import OperatorsManagementPerfilEdit from "../pages/form-operators-perfil-edit/OperatorsManagementPerfilEdit";
import AdmManagementPerfilEdit from "../pages/form-adm-perfil-edit/AdmManagementPerfilEdit";

const BACKOFFICE_ROUTE = "/backoffice";
const LOGIN_ROUTE = "/signin/backoffice";

function RequireAuthBackoffice({ children }: { children: JSX.Element }) {
  useEffect(() => {
    const session = sessionStorage.getItem("registerbackoffice");
    if (!session) {
      localStorage.clear();
      sessionStorage.setItem("registerbackoffice", "2");
    }
  }, []);

  return children;
}

export function Router() {
  const { isAuthenticated, onLogout } = useAuthBackoffice();

  return (
    <Routes>
      {/* Rotas quando faz o login */}

      <Route
        element={
          <GuardedRoute
            isRouteAccessible={!isAuthenticated}
            redirectRoute={isAuthenticated ? BACKOFFICE_ROUTE : LOGIN_ROUTE}
          />
        }
      >
        <Route path="/" element={<BackofficeSignIn />} />
      </Route>

      <Route element={<GuardedRoute isRouteAccessible={isAuthenticated} redirectRoute={"/"} />}>
        <Route
          path="/*"
          element={
            <RequireAuthBackoffice>
              <BackofficeLayout />
            </RequireAuthBackoffice>
          }
        >
          <Route path="backoffice" element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="users" element={<Contacts />} />
          <Route path="operators-management" element={<OperatorManager />} />
          {/* <Route path="operators-management2" element={<OperatorManager2 />} /> */}
          <Route path="spreadsheets" element={<SpreadsheetApp />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="create-form-group" element={<FormGroup />} />
          <Route path="create-form-room" element={<FormRoom />} />
          <Route path="create-form-user" element={<FormUser />} />
          <Route path="cambioPage" element={<CambioPage />} />
          <Route path="invoices-management" element={<InvocesManagement />} />
          <Route path="tokens-management" element={<TokensManagement />} />
          <Route path="billets-management" element={<BillsManagement />} />
          <Route path="meu-perfil-operator" element={<OperatorsManagementPerfilEdit />} />
          <Route path="meu-perfil-master" element={<AdmManagementPerfilEdit />} />
          {/* <Route path="/backoffice/plans" element={<Plans />} />
            <Route path="/backoffice/transactions-pagbank" element={<TransactionsPagbank />} />
            <Route path="/backoffice/extracts-pagbank" element={<ExtractsPagbank />} />
            <Route path="/backoffice/signup-pf" element={<SignUpPfForBackoffice />} /> */}

          {/* <Route path="/backoffice/signup-pj" element={<SignUpPjForBackoffice />} /> */}

          {/* <Route path="/backoffice/forward-invoice-pagbank" element={<ForwardInvoicePagbank />} />
            <Route path="/backoffice/request-limits-users" element={<RequestLimitsWalllet />} />
            <Route path="/backoffice/transactions-pagbank/:id" element={<TransactionsPagbankDetails />} />
             */}
          {/* <Route index element={<HomeDash />} /> */}

          {/* <Route path="/backoffice/accounts" element={<Accounts />} />
            <Route path="/backoffice/get-transaction-delbank" element={<GetTrasactionsMaster />} />
            <Route path="/backoffice/accounts/wallet" element={<AccountsWallet />} />
            <Route path="/backoffice/accounts/ca" element={<AccountsCA />} />
            <Route path="/backoffice/accounts/:id" element={<Member />} />
            <Route path="/backoffice/upload/delbank/:id" element={<UploadDocumentsDelbank />} />
            <Route path="/backoffice/accounts/wallet/:id" element={<Wallet />} />
            <Route path="/backoffice/accounts/wallet/:id/extract" element={<WalletTransactions />} /> */}

          {/* <Route path="/backoffice/accounts/graphic/:id" element={<Graphic />} /> */}

          {/* <Route path="/backoffice/accounts/:id/tax" element={<AccountsDetailsTax />} />
            <Route path="/backoffice/accounts/wallet/:id/tax" element={<WalletDetailsTax />} /> */}

          {/* <Route path="/backoffice/transfers" element={<Transfers />} />

            <Route path="/backoffice/financial" element={<AccountsDetailsTransactions />} />

            <Route path="/backoffice/control-account" element={<ControlAccountsTransactions />} />
            <Route path="/backoffice/wallet/transactions" element={<TransactionsWallet />} />

            <Route path="/backoffice/accounts/:id/extract" element={<ContaAccounts />} />

            <Route path="/backoffice/config/persons" element={<ConfigPersons />} />
            <Route path="/backoffice/config/tax" element={<ConfigTax />} />
            <Route path="/backoffice/get-count-transactions" element={<CountTransactions />} />
            <Route path="/backoffice/config/tax/form" element={<FormConfigTax />} />
            <Route path="/backoffice/config/tax/form/:id" element={<FormConfigTax />} />
            <Route path="/backoffice/config/operators/form" element={<FormOperators />} />
            <Route path="/backoffice/config/operators/list" element={<ListOperators />} /> */}

          <Route path="logout" element={<Logout />} />
          {/* <Route path="/backoffice/tax" element={<TaxBackoffice />} />
            <Route path="/backoffice/support" element={<SupportBackoffice />} /> */}
        </Route>
      </Route>
      {/* <Route path="/logs/transactions/one" element={<LostTransactionsOneHour />} />
        <Route path="/logs/transactions/six" element={<LostTransactionsSixHours />} /> */}
    </Routes>
  );
}
