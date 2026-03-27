export type LanguageId = 
  | 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' 
  | 'java' | 'go' | 'rust' | 'php' | 'r' 
  | 'csharp' | 'sqlite' | 'mongodb' 
  | 'html' | 'react' | 'vue' | 'angular';

export interface LanguageConfig {
  id: LanguageId;
  name: string;
  monacoLanguage: string;
  defaultCode: string;
  isWebMode: boolean;
  isSpecial: boolean;
  defaultFiles?: { name: string; content: string }[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}
