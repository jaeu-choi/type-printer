import { GenericResolver } from "./genericResolver";
import { TypeLookupService } from "./typeLookupService";
import { MappingAnalyzer } from "./mappingAnalyzer";
export class TypeAnalyzer {
  private genericResolver: GenericResolver;
  private lookupService: TypeLookupService;
  private mappingAnalyzer: MappingAnalyzer;

  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly sourceFile: ts.SourceFile
  ) {
    this.genericResolver = new GenericResolver(checker, sourceFile);
    this.lookupService = new TypeLookupService(checker, sourceFile);
    this.mappingAnalyzer = new MappingAnalyzer(checker, this.lookupService);
  }

  /**
   * 🎯 고급 타입 분석 (제네릭, 매핑 등 포함)
   */
  analyzeAdvancedType(
    name: string,
    options?: {
      mappedAnalysis?: {
        enabled: boolean;
        pattern: string;
        typeArgs: string[];
      };
    }
  ): {
    typeName: string;
    isInstantiated: boolean;
    typeArgs: string[];
    genericContext?: Map<string, TypeStructure>;
    mappingInfo?: any;
  } {
    // 제네릭 파싱
    const { typeName, isInstantiated, typeArgs } =
      this.genericResolver.parseTypeRequest(name);

    // 제네릭 컨텍스트 생성
    const genericContext = isInstantiated
      ? this.genericResolver.createGenericContext(typeName, typeArgs)
      : undefined;

    // 매핑 분석 (옵션)
    let mappingInfo = null;
    if (options?.mappedAnalysis && options.mappedAnalysis.enabled) {
      mappingInfo = this.mappingAnalyzer.collectMappingAnalysisInfo(
        options.mappedAnalysis,
        typeName
      );
    }

    return {
      typeName,
      isInstantiated,
      typeArgs,
      genericContext,
      mappingInfo,
    };
  }

  /**
   * 🎯 타입 검색 위임
   */
  findTypeDeclaration(name: string) {
    return this.lookupService.findTypeDeclaration(name);
  }

  findSymbolByName(name: string) {
    return this.lookupService.findSymbolByName(name);
  }

  analyzeTypeStructure(typeName: string) {
    return this.lookupService.analyzeTypeStructure(typeName);
  }
}
