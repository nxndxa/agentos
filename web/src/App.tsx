import { IntroScreen } from "./components/IntroScreen";
import { Workspace } from "./components/Workspace";
import { useAgentOS } from "./lib/useAgentOS";

export default function App() {
  const agentos = useAgentOS();

  if (agentos.state.phase === "intro") {
    return <IntroScreen onStart={agentos.start} />;
  }

  return <Workspace agentos={agentos} />;
}
