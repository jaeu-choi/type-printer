// import * as ts from "typescript";
// import { TypeStructure, TypeCollectionContext } from "./types";

// export class TypeLookupService {
//   constructor(
//     private readonly checker: ts.TypeChecker,
//     private readonly sourceFile: ts.SourceFile
//   ) {}

//   /**
//    * 타입 선언 찾기
//    */
//   findTypeDeclaration(
//     name: string
//   ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
//     for (const statement of this.sourceFile.statements) {
//       if (
//         (ts.isTypeAliasDeclaration(statement) ||
//           ts.isInterfaceDeclaration(statement)) &&
//         statement.name?.text === name
//       ) {
//         return statement;
//       }
//     }
//     return null;
//   }

//   /**
//    * 심볼 찾기
//    */
//   findSymbolByName(name: string): ts.Symbol | undefined {
//     for (const statement of this.sourceFile.statements) {
//       if (
//         (ts.isTypeAliasDeclaration(statement) ||
//           ts.isInterfaceDeclaration(statement) ||
//           ts.isFunctionDeclaration(statement) ||
//           ts.isEnumDeclaration(statement) ||
//           ts.isClassDeclaration(statement)) &&
//         statement.name?.text === name
//       ) {
//         return this.checker.getSymbolAtLocation(statement.name);
//       }

//       if (ts.isVariableStatement(statement)) {
//         for (const decl of statement.declarationList.declarations) {
//           if (ts.isIdentifier(decl.name) && decl.name.text === name) {
//             return this.checker.getSymbolAtLocation(decl.name);
//           }
//         }
//       }
//     }

//     return undefined;
//   }

//   /**
//    * 타입 분석 (인터페이스/타입 별칭 프로퍼티)
//    */
//   analyzeTypeStructure(typeName: string): {
//     properties?: Array<{ name: string; value?: string; typeString: string }>;
//   } | null {
//     try {
//       const typeDecl = this.findTypeDeclaration(typeName);
//       if (!typeDecl) {
//         console.log(`⚠️ Cannot find type declaration: ${typeName}`);
//         return null;
//       }

//       if (ts.isInterfaceDeclaration(typeDecl)) {
//         return this.analyzeInterfaceProperties(typeDecl);
//       }

//       if (ts.isTypeAliasDeclaration(typeDecl)) {
//         return this.analyzeTypeAliasProperties(typeDecl);
//       }

//       return null;
//     } catch (error) {
//       console.log(`⚠️ Type analysis failed for ${typeName}:`, error);
//       return null;
//     }
//   }

//   private analyzeInterfaceProperties(interfaceDecl: ts.InterfaceDeclaration) {
//     const properties: Array<{
//       name: string;
//       value?: string;
//       typeString: string;
//     }> = [];

//     for (const member of interfaceDecl.members) {
//       if (ts.isPropertySignature(member) && member.name && member.type) {
//         const propName = member.name.getText().replace(/['"]/g, "");
//         const typeNode = member.type;
//         const typeString = this.checker.typeToString(
//           this.checker.getTypeFromTypeNode(typeNode)
//         );

//         let value: string | undefined;
//         if (ts.isLiteralTypeNode(typeNode)) {
//           value = typeNode.literal.getText().replace(/['"]/g, "");
//         }

//         properties.push({ name: propName, value, typeString });
//       }
//     }

//     return { properties };
//   }

//   private analyzeTypeAliasProperties(typeDecl: ts.TypeAliasDeclaration) {
//     if (ts.isTypeLiteralNode(typeDecl.type)) {
//       const properties: Array<{
//         name: string;
//         value?: string;
//         typeString: string;
//       }> = [];

//       for (const member of typeDecl.type.members) {
//         if (ts.isPropertySignature(member) && member.name && member.type) {
//           const propName = member.name.getText().replace(/['"]/g, "");
//           const typeNode = member.type;
//           const typeString = this.checker.typeToString(
//             this.checker.getTypeFromTypeNode(typeNode)
//           );

//           let value: string | undefined;
//           if (ts.isLiteralTypeNode(typeNode)) {
//             value = typeNode.literal.getText().replace(/['"]/g, "");
//           }

//           properties.push({ name: propName, value, typeString });
//         }
//       }

//       return { properties };
//     }

//     return null;
//   }

//   /**
//    * 객체 타입 판별
//    */
//   isObjectType(typeString: string): boolean {
//     return typeString.includes("{") && typeString.includes("}");
//   }
// }
