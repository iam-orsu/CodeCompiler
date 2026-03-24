export type LanguageId = 
  | 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' 
  | 'java' | 'go' | 'rust' | 'php' | 'bash' | 'r' 
  | 'csharp' | 'ruby' | 'scala' | 'sqlite' | 'mongodb' 
  | 'html' | 'react' | 'vue' | 'angular';

export interface LanguageConfig {
  id: LanguageId;
  name: string;
  monacoLanguage: string;
  defaultCode: string;
  isWebMode: boolean;
  isSpecial: boolean;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}
