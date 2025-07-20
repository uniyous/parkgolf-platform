import { useEffect } from "react";
import { AppRouter } from "./router";
import { useAuth } from "../redux/hooks/useAuth";

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    // 앱 시작 시 인증 상태 확인
    checkAuth();
  }, [checkAuth]);

  return <AppRouter />;
}

export default App;