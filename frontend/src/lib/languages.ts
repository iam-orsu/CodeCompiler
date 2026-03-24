import { LanguageId, LanguageConfig } from '../types';

export const LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    monacoLanguage: 'python',
    defaultCode: 'name = input("Enter name: ")\nprint(f"Hello {name}")',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'javascript',
    name: 'Node.js',
    monacoLanguage: 'javascript',
    defaultCode: 'console.log("Hello Node!");',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    defaultCode: 'const msg: string = "Hello TS!";\nconsole.log(msg);',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'c',
    name: 'C',
    monacoLanguage: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello C!\\n");\n    return 0;\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLanguage: 'cpp',
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello C++!\\n";\n    return 0;\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'java',
    name: 'Java',
    monacoLanguage: 'java',
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'go',
    name: 'Go',
    monacoLanguage: 'go',
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello Go!")\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoLanguage: 'rust',
    defaultCode: 'fn main() {\n    println!("Hello Rust!");\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'php',
    name: 'PHP',
    monacoLanguage: 'php',
    defaultCode: '<?php\n\necho "Hello PHP!\\n";\n',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'r',
    name: 'R',
    monacoLanguage: 'r',
    defaultCode: 'cat("Hello R!\\n")',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'csharp',
    name: 'C#',
    monacoLanguage: 'csharp',
    defaultCode: 'using System;\n\nConsole.WriteLine("Hello C#!");',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'ruby',
    name: 'Ruby',
    monacoLanguage: 'ruby',
    defaultCode: 'puts "Hello Ruby!"',
    isWebMode: false,
    isSpecial: false
  },

  {
    id: 'sqlite',
    name: 'SQLite',
    monacoLanguage: 'sql',
    defaultCode: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO users (name) VALUES ("Runly");\nSELECT * FROM users;',
    isWebMode: false,
    isSpecial: true
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    monacoLanguage: 'javascript',
    defaultCode: 'db.users.insertOne({ name: "Runly" });\nprintjson(db.users.find().toArray());',
    isWebMode: false,
    isSpecial: true
  },
  {
    id: 'html',
    name: 'Vanilla HTML/JS',
    monacoLanguage: 'html',
    defaultCode: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Preview</title>\n</head>\n<body>\n  <h1>Hello Web!</h1>\n</body>\n</html>',
    isWebMode: true,
    isSpecial: false
  },
  {
    id: 'react',
    name: 'React',
    monacoLanguage: 'javascript',
    defaultCode: 'const App = () => <h1>Hello React!</h1>;\n\nconst root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<App />);',
    isWebMode: true,
    isSpecial: false
  },
  {
    id: 'vue',
    name: 'Vue',
    monacoLanguage: 'html',
    defaultCode: '<div id="app">{{ message }}</div>\n\n<script>\n  const { createApp } = Vue;\n  createApp({\n    data() {\n      return { message: "Hello Vue!" };\n    }\n  }).mount("#app");\n</script>',
    isWebMode: true,
    isSpecial: false
  },
  {
    id: 'angular',
    name: 'Angular',
    monacoLanguage: 'typescript',
    defaultCode: '// Angular setup goes here',
    isWebMode: true,
    isSpecial: false
  }
];
