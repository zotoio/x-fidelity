import { Layout } from './components/Layout';
import { RuleTree } from './components/RuleTree';
import { RuleForm } from './components/RuleForm';
import { JsonEditor } from './components/JsonEditor';
import { SimulationPanel } from './components/SimulationPanel';
import { useTheme } from './hooks';

function App(): JSX.Element {
  // Initialize theme sync with Docusaurus
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout
      leftPanel={<RuleTree />}
      centerPanel={<RuleForm />}
      rightPanel={<JsonEditor />}
      bottomPanel={<SimulationPanel />}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

export default App;
