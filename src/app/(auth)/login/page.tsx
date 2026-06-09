import LoginPageUI from "@/module/auth/components/LoginPageUI";
import { requireUnAuth } from "@/module/auth/utils/auth-utils";

const LoginPage = async () => {

  await requireUnAuth();

  return (
    <div>
      <LoginPageUI />
    </div>
  );
};

export default LoginPage;
