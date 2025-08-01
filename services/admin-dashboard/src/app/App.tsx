import { AppRouter } from "./router";
import { AdminAuthProvider } from "../contexts/AdminAuthContext";

function App() {
  return (
    <AdminAuthProvider>
      <AppRouter />
    </AdminAuthProvider>
  );
}

export default App;