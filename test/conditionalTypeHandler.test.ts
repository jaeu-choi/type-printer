// test/conditionalTypeHandler.test.ts

import * as ts from "typescript";

// 🔧 수정된 import 경로들 (src/ 경로에 맞게)
import { ConditionalTypeHandler } from "../src/Printer/handlers/conditionalTypeHandler";
import {
  TypeCreationContext,
  createTypeCreationContext,
  TypeNode,
} from "../src/Printer/ir";
import { globalHandlerRegistry } from "../src/Printer/handlers/registry";
import { initializeAvailableHandlers } from "../src/Printer/handlers/setup";

// 🔧 Jest 타입 정의 확인을 위한 타입 선언 (필요시)
declare global {
  namespace jest {
    interface Matchers<R> {
      toBe(expected: any): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toEqual(expected: any): R;
      toContain(expected: any): R;
    }
  }
}

/**
 * 🧪 ConditionalTypeHandler 테스트
 * 조건부 타입과 infer 키워드 통합 처리 테스트
 */
describe("ConditionalTypeHandler", () => {
  let handler: ConditionalTypeHandler;
  let checker: ts.TypeChecker;
  let program: ts.Program;
  let sourceFile: ts.SourceFile;

  beforeAll(() => {
    // 핸들러 시스템 초기화
    initializeAvailableHandlers();
  });

  beforeEach(() => {
    handler = new ConditionalTypeHandler();

    // 🔧 getDefaultLibFileName 추가된 CompilerHost
    const compilerHost: ts.CompilerHost = {
      getSourceFile: (fileName: string): ts.SourceFile | undefined => {
        if (fileName === "test.ts") {
          return ts.createSourceFile(
            fileName,
            `
              type IsString<T> = T extends string ? "yes" : "no";
              type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
              type ArrayElement<T> = T extends (infer U)[] ? U : never;
              type User = { name: string; age: number };
              type Admin = { role: string; permissions: string[] };
            `,
            ts.ScriptTarget.ES2022
          );
        }
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => "",
      getCanonicalFileName: (fileName: string) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      // 🔧 누락된 필수 메서드 추가
      getDefaultLibFileName: (options: ts.CompilerOptions) => {
        return ts.getDefaultLibFilePath(options);
      },
    };

    program = ts.createProgram(
      ["test.ts"],
      {
        target: ts.ScriptTarget.ES2022,
        strictNullChecks: true,
      },
      compilerHost
    );

    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile("test.ts")!;
  });

  describe("Handler Registration and Basic Functionality", () => {
    test("should be properly registered", () => {
      expect(handler).toBeDefined();
      expect(handler.name).toBe("ConditionalTypeHandler");
      expect(handler.priority).toBeDefined();
    });

    test("should identify conditional types", () => {
      // IsString<T> 타입 별칭 찾기
      const typeAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "IsString"
      );

      expect(typeAlias).toBeDefined();
      expect(typeAlias!.type).toBeDefined();
      expect(ts.isConditionalTypeNode(typeAlias!.type)).toBe(true);
      expect(
        handler.isApplicable(
          checker.getTypeFromTypeNode(typeAlias!.type),
          typeAlias!.type
        )
      ).toBe(true);
    });

    test("should handle infer types", () => {
      // ReturnType<T> 찾기 (infer 포함)
      const returnTypeAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ReturnType"
      );

      expect(returnTypeAlias).toBeDefined();
      expect(returnTypeAlias!.type.getText()).toContain("infer R");
      expect(
        handler.isApplicable(
          checker.getTypeFromTypeNode(returnTypeAlias!.type),
          returnTypeAlias!.type
        )
      ).toBe(true);
    });

    test("should create valid TypeNode for conditional types", () => {
      const isStringAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "IsString"
      );

      const context = createTypeCreationContext(checker, program, sourceFile);
      const typeNode = handler.createTypeNode(
        checker.getTypeFromTypeNode(isStringAlias!.type),
        isStringAlias!.type,
        context
      );

      expect(typeNode).toBeDefined();
      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.conditionalInfo).toBeDefined();
      expect(typeNode.metadata?.educationalSteps).toBeDefined();
      expect(typeNode.metadata?.conditionalEvaluationInfo).toBeDefined();
    });
  });

  describe("Conditional Type Processing", () => {
    test("should process basic conditional types", () => {
      const isStringAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "IsString"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile);
      const type = checker.getTypeFromTypeNode(isStringAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        isStringAlias.type,
        context
      );

      expect(typeNode.conditionalInfo).toBeDefined();
      expect(typeNode.conditionalInfo!.checkType).toBeDefined();
      expect(typeNode.conditionalInfo!.extendsType).toBeDefined();
      expect(typeNode.conditionalInfo!.trueType).toBeDefined();
      expect(typeNode.conditionalInfo!.falseType).toBeDefined();
    });

    test("should handle infer in conditional types", () => {
      const returnTypeAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ReturnType"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile);
      const type = checker.getTypeFromTypeNode(returnTypeAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        returnTypeAlias.type,
        context
      );

      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);
      expect(typeNode.metadata?.educationalSteps).toBeDefined();
      expect(typeNode.metadata?.educationalSteps!.length).toBeGreaterThan(0);
    });

    test("should provide educational steps", () => {
      const arrayElementAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ArrayElement"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile);
      const type = checker.getTypeFromTypeNode(arrayElementAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        arrayElementAlias.type,
        context
      );

      expect(typeNode.metadata?.educationalSteps).toBeDefined();
      expect(typeNode.metadata?.educationalSteps!.length).toBeGreaterThan(2);

      const steps = typeNode.metadata!.educationalSteps!;
      expect(steps.some((step) => step.type === "generic-detection")).toBe(
        true
      );
      expect(steps.some((step) => step.type === "definition-lookup")).toBe(
        true
      );
    });
  });

  describe("Integration with Other Handlers", () => {
    test("should work with reference types in conditional branches", () => {
      // 더 복잡한 조건부 타입 테스트
      const complexSource = `
        type UserOrAdmin<T> = T extends { role: string } ? Admin : User;
      `;

      const complexFile = ts.createSourceFile(
        "complex.ts",
        complexSource,
        ts.ScriptTarget.ES2022
      );

      // 🔧 수정된 CompilerHost (getDefaultLibFileName 포함)
      const complexHost: ts.CompilerHost = {
        getSourceFile: (fileName: string) => {
          if (fileName === "complex.ts") return complexFile;
          if (fileName === "test.ts") return sourceFile;
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "",
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => "",
        getCanonicalFileName: (fileName: string) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        // 🔧 누락된 필수 메서드 추가
        getDefaultLibFileName: (options: ts.CompilerOptions) => {
          return ts.getDefaultLibFilePath(options);
        },
      };

      const complexProgram = ts.createProgram(
        ["complex.ts", "test.ts"],
        { target: ts.ScriptTarget.ES2022 },
        complexHost
      );

      const complexChecker = complexProgram.getTypeChecker();
      const complexSourceFile = complexProgram.getSourceFile("complex.ts")!;

      const userOrAdminAlias = complexSourceFile
        .statements[0] as ts.TypeAliasDeclaration;
      const context = createTypeCreationContext(
        complexChecker,
        complexProgram,
        complexSourceFile
      );

      const type = complexChecker.getTypeFromTypeNode(userOrAdminAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        userOrAdminAlias.type,
        context
      );

      expect(typeNode).toBeDefined();
      expect(typeNode.conditionalInfo).toBeDefined();
    });

    test("should handle nested TypeNode creation", () => {
      const returnTypeAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ReturnType"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile);
      const type = checker.getTypeFromTypeNode(returnTypeAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        returnTypeAlias.type,
        context
      );

      // 조건부 타입의 각 부분이 올바른 TypeNode를 가지는지 확인
      expect(typeNode.conditionalInfo!.checkType.kind).toBeDefined();
      expect(typeNode.conditionalInfo!.extendsType.kind).toBeDefined();
      expect(typeNode.conditionalInfo!.trueType.kind).toBeDefined();
      expect(typeNode.conditionalInfo!.falseType.kind).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should handle missing context gracefully", () => {
      const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
      const type = checker.getTypeFromTypeNode(typeAlias.type);

      // context 없이 호출
      const typeNode = handler.createTypeNode(type, typeAlias.type);

      expect(typeNode.kind).toBe("unknown");
      expect(typeNode.metadata?.debug?.warnings).toContain(
        "No context provided for conditional type"
      );
    });

    test("should handle invalid conditional structures", () => {
      // 비조건부 타입으로 테스트
      const userAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "User"
      ) as ts.TypeAliasDeclaration;

      expect(
        handler.isApplicable(
          checker.getTypeFromTypeNode(userAlias.type),
          userAlias.type
        )
      ).toBe(false);
    });
  });

  describe("Educational Content Generation", () => {
    test("should generate comprehensive educational steps for infer types", () => {
      const returnTypeAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ReturnType"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile, {
        expanded: true,
        includeDebugInfo: true,
      });

      const type = checker.getTypeFromTypeNode(returnTypeAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        returnTypeAlias.type,
        context
      );

      const steps = typeNode.metadata?.educationalSteps || [];

      // infer 관련 단계들이 포함되어 있는지 확인
      expect(steps.length).toBeGreaterThan(3);
      expect(steps.some((step) => step.description.includes("infer"))).toBe(
        true
      );
      expect(steps.some((step) => step.details?.hasInfer === true)).toBe(true);
    });

    test("should provide intermediate steps", () => {
      const arrayElementAlias = sourceFile.statements.find(
        (stmt): stmt is ts.TypeAliasDeclaration =>
          ts.isTypeAliasDeclaration(stmt) && stmt.name.text === "ArrayElement"
      ) as ts.TypeAliasDeclaration;

      const context = createTypeCreationContext(checker, program, sourceFile, {
        expanded: true,
      });

      const type = checker.getTypeFromTypeNode(arrayElementAlias.type);
      const typeNode = handler.createTypeNode(
        type,
        arrayElementAlias.type,
        context
      );

      expect(typeNode.metadata?.intermediateSteps).toBeDefined();
      if (typeNode.metadata?.intermediateSteps) {
        expect(typeNode.metadata.intermediateSteps.length).toBeGreaterThan(0);
        typeNode.metadata.intermediateSteps.forEach((step) => {
          expect(step.stepType).toBeDefined();
          expect(step.description).toBeDefined();
          expect(step.input).toBeDefined();
          expect(step.output).toBeDefined();
        });
      }
    });
  });

  describe("Static Methods and Utilities", () => {
    test("should provide supported types list", () => {
      const supportedTypes = ConditionalTypeHandler.getSupportedTypes();
      expect(supportedTypes).toBeDefined();
      expect(supportedTypes.length).toBeGreaterThan(0);
      expect(supportedTypes.some((type) => type.includes("conditional"))).toBe(
        true
      );
      expect(supportedTypes.some((type) => type.includes("infer"))).toBe(true);
    });

    test("should provide examples", () => {
      const examples = ConditionalTypeHandler.createExamples();
      expect(examples).toBeDefined();
      expect(examples.length).toBeGreaterThan(0);

      examples.forEach((example) => {
        expect(example.description).toBeDefined();
        expect(example.value).toBeDefined();
        expect(example.expectedBehavior).toBeDefined();
      });
    });
  });

  afterAll(() => {
    // 정리 작업 (필요시)
    globalHandlerRegistry.clear();
  });
});

// 🔧 헬퍼 함수들
function createTestContext(
  checker: ts.TypeChecker,
  program: ts.Program,
  sourceFile: ts.SourceFile
): TypeCreationContext {
  return createTypeCreationContext(checker, program, sourceFile, {
    maxDepth: 5,
    expanded: true,
    includeDebugInfo: true,
  });
}

// 🔧 TypeScript CompilerHost 생성 헬퍼 (getDefaultLibFileName 포함)
function createTestCompilerHost(
  sourceCode: string,
  fileName = "test.ts"
): ts.CompilerHost {
  return {
    getSourceFile: (requestedFileName: string): ts.SourceFile | undefined => {
      if (requestedFileName === fileName) {
        return ts.createSourceFile(
          fileName,
          sourceCode,
          ts.ScriptTarget.ES2022
        );
      }
      return undefined;
    },
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => "",
    getCanonicalFileName: (fileName: string) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    // 🔧 필수 메서드 추가
    getDefaultLibFileName: (options: ts.CompilerOptions) => {
      return ts.getDefaultLibFilePath(options);
    },
  };
}
