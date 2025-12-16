// Re-export compilation logic from shared compiler
// This file exists for use in server-side/Lambda rendering context
export { compileCode, type CompilationResult } from "../hooks/codeCompiler";
