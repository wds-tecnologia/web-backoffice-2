  const [SidebarMobileIsActive, setSidebarMobileIsActive] = useState(false);
  // const [BellBoxMessageIsActive, setBoxMessageIsActive] = useState(false);
  // const [otherAccountsIsActive, setOtherAccountsIsActive] = useState(false);
  const [modalReferenceIsOpen, setModalReferenceIsOpen] = useState(false);
  const location = useLocation();

  // const HandleOtherAccountsToggle = () => {
  //   setOtherAccountsIsActive((state) => !state);
  // };

  const handleSidebarMobileToggle = () => {
    setSidebarMobileIsActive((state) => !state);
  };

  const handleOpenReferenceModal = () => {
    setModalReferenceIsOpen(true);
  };

  const handleCloseReferenceModal = () => {
    setModalReferenceIsOpen(false);
  };

  useEffect(() => {
    setSidebarMobileIsActive(false);
  }, [location.pathname]);

  return (
    <SocketContextProvider>
      <Content>
        <Header />

        <TopRow>
          <BalanceOverview />
          <PixArea />
        </TopRow>

        <Container>
          <LeftDiv>
            <TopComponent>
              <TextGroup>
                <Label><h2>Câmbio</h2></Label>
                <CurrencyExchange />
              </TextGroup>
            </TopComponent>

            <TopComponent>
              <TextGroup>
                <Label><h2>Maquininha</h2></Label>
                <MachinesSection />
              </TextGroup>
            </TopComponent>

            <BottomComponent>
              <TextGroup>
                <Label><h2>Crypto</h2></Label>
                <CryptoSection />
              </TextGroup>
            </BottomComponent>
          </LeftDiv>
          <RightDiv>
          <TextGroup>
                <Label>
                <h2 style={{ color: "#1e1e1e", marginLeft: "45px" }}>Últimos lançamentos</h2>
                </Label>
                <RecentTransactions />
                </TextGroup>
            <TransactionExtract onClick={handleOpenReferenceModal}>Transaction Extract</TransactionExtract>
          </RightDiv>
        </Container>
      </Content>
      <ModalReference isOpen={modalReferenceIsOpen} handleClose={handleCloseReferenceModal} />
    </SocketContextProvider>
  );
