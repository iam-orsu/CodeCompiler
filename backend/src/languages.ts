export type LanguageId =
  | 'python'
  | 'node'
  | 'typescript'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'java'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'mongodb'
  | 'html'
  | 'react'
  | 'vue'
  | 'angular'
  | 'sqlite';

export interface LanguageConfig {
  id: LanguageId;
  name: string;
  extension: string;
  monacoId: string;
  isWebMode: boolean;
  isSpecial: boolean;
  compiled: boolean;
  memoryLimit: number;
  cpuLimit: number;
  timeoutMs: number;
  pidsLimit: number;
  extraTmpfs?: Record<string, string>;
  defaultCode: string;
}

export const LANGUAGES: LanguageConfig[] = [
  // Backend Interpreted Languages
  {
    id: 'python',
    name: 'Python 3.12',
    extension: '.py',
    monacoId: 'python',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456, // 256MB
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'print("Hello, Runly!")\n',
  },
  {
    id: 'node',
    name: 'Node.js 20',
    extension: '.js',
    monacoId: 'javascript',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456,
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'console.log("Hello, Runly!");\n',
  },
  {
    id: 'typescript',
    name: 'TypeScript 5',
    extension: '.ts',
    monacoId: 'typescript',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456,
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'const greeting: string = "Hello, Runly!";\nconsole.log(greeting);\n',
  },
  {
    id: 'php',
    name: 'PHP 8.3',
    extension: '.php',
    monacoId: 'php',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456,
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: '<?php\n  echo "Hello, Runly!\\n";\n?>\n',
  },
  {
    id: 'ruby',
    name: 'Ruby 3.3',
    extension: '.rb',
    monacoId: 'ruby',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456,
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'puts "Hello, Runly!"\n',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    extension: '.js',
    monacoId: 'javascript',
    isWebMode: false,
    isSpecial: false,
    compiled: false,
    memoryLimit: 268435456,
    cpuLimit: 0.5,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'printjson({ message: "Hello, Runly!" });\n',
  },

  // Backend Compiled Languages
  {
    id: 'c',
    name: 'C (GCC)',
    extension: '.c',
    monacoId: 'c',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 268435456,
    cpuLimit: 1.0,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, Runly!\\n");\n    return 0;\n}\n',
  },
  {
    id: 'cpp',
    name: 'C++ (GCC)',
    extension: '.cpp',
    monacoId: 'cpp',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 268435456,
    cpuLimit: 1.0,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, Runly!" << std::endl;\n    return 0;\n}\n',
  },
  {
    id: 'rust',
    name: 'Rust 1.77',
    extension: '.rs',
    monacoId: 'rust',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 268435456,
    cpuLimit: 1.0,
    timeoutMs: 30000,
    pidsLimit: 64,
    defaultCode: 'fn main() {\n    println!("Hello, Runly!");\n}\n',
  },
  {
    id: 'go',
    name: 'Go 1.22',
    extension: '.go',
    monacoId: 'go',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 268435456,
    cpuLimit: 1.0,
    timeoutMs: 60000,
    pidsLimit: 256,
    extraTmpfs: { '/.cache': 'size=200m' },
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Runly!")\n}\n',
  },
  {
    id: 'java',
    name: 'Java 21',
    extension: 'Main.java',
    monacoId: 'java',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 536870912, // 512MB
    cpuLimit: 1.0,
    timeoutMs: 60000,
    pidsLimit: 256,
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Runly!");\n    }\n}\n',
  },
  {
    id: 'csharp',
    name: 'C# (.NET 9)',
    extension: '.cs',
    monacoId: 'csharp',
    isWebMode: false,
    isSpecial: false,
    compiled: true,
    memoryLimit: 536870912,
    cpuLimit: 1.0,
    timeoutMs: 60000,
    pidsLimit: 64,
    extraTmpfs: { '/tmp/nuget-cache': 'size=100m' },
    defaultCode: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, Runly!");\n    }\n}\n',
  },

  // Web Previews
  {
    id: 'html',
    name: 'HTML/CSS/JS',
    extension: '.html',
    monacoId: 'html',
    isWebMode: true,
    isSpecial: false,
    compiled: false,
    memoryLimit: 0,
    cpuLimit: 0,
    timeoutMs: 0,
    pidsLimit: 0,
    defaultCode: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello, Runly!</h1>\n</body>\n</html>\n',
  },
  {
    id: 'react',
    name: 'React 18',
    extension: '.jsx',
    monacoId: 'javascript',
    isWebMode: true,
    isSpecial: false,
    compiled: false,
    memoryLimit: 0,
    cpuLimit: 0,
    timeoutMs: 0,
    pidsLimit: 0,
    defaultCode: 'function App() {\n  return <h1>Hello, React!</h1>;\n}\n\nconst root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<App />);\n',
  },
  {
    id: 'vue',
    name: 'Vue 3',
    extension: '.vue',
    monacoId: 'html',
    isWebMode: true,
    isSpecial: false,
    compiled: false,
    memoryLimit: 0,
    cpuLimit: 0,
    timeoutMs: 0,
    pidsLimit: 0,
    defaultCode: '<div id="app">{{ message }}</div>\n\n<script>\n  const { createApp } = Vue;\n  createApp({\n    setup() {\n      return { message: "Hello, Vue!" };\n    }\n  }).mount("#app");\n</script>\n',
  },
  {
    id: 'angular',
    name: 'AngularJS 1.x',
    extension: '.html',
    monacoId: 'html',
    isWebMode: true,
    isSpecial: false,
    compiled: false,
    memoryLimit: 0,
    cpuLimit: 0,
    timeoutMs: 0,
    pidsLimit: 0,
    defaultCode: '<div ng-app="myApp" ng-controller="myCtrl">\n  <h1>{{ message }}</h1>\n</div>\n\n<script>\n  angular.module("myApp", []).controller("myCtrl", function($scope) {\n    $scope.message = "Hello, AngularJS!";\n  });\n</script>\n',
  },

  // Special Mode
  {
    id: 'sqlite',
    name: 'SQLite',
    extension: '.sql',
    monacoId: 'sql',
    isWebMode: false,
    isSpecial: true,
    compiled: false,
    memoryLimit: 0,
    cpuLimit: 0,
    timeoutMs: 0,
    pidsLimit: 0,
    defaultCode: 'CREATE TABLE users (id INT, name TEXT);\nINSERT INTO users VALUES (1, "Runly");\nSELECT * FROM users;\n',
  },
];
