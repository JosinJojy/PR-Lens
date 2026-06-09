import { Button } from "@/components/ui/button";
import Logout from "@/module/auth/components/Logout";
import { requireAuth } from "@/module/auth/utils/auth-utils";

export default async function Home() {
  await requireAuth();

  return <div>
    Hello World
    <Logout>
      <Button>Logout</Button>
    </Logout>
  </div>;
}
