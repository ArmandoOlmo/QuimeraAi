# 🧪 Tests - Quimera AI

## Resumen

Este directorio contiene los tests unitarios para las utilidades críticas del sistema.

**Estado**: ✅ 24 tests pasando | 0 fallando

---

## 📁 Estructura

```
tests/
├── setup.ts                           # Configuración global de tests
├── README.md                          # Este archivo
└── utils/
    ├── conditionalEngine.test.ts      # Tests del motor de condiciones (17 tests)
    └── performanceOptimizations.test.ts # Tests de optimizaciones (7 tests)
```

---

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Modo watch (desarrollo)
```bash
npm test -- --watch
```

### Con UI visual
```bash
npm run test:ui
```

### Con coverage
```bash
npm run test:coverage
```

### Solo un archivo
```bash
npm test tests/utils/conditionalEngine.test.ts
```

---

## 📊 Cobertura

### ConditionalEngine (17 tests)

**Funciones probadas**:
- ✅ `evaluateCondition()` - 8 tests
  - Operadores: equals, notEquals, contains, greaterThan, lessThan, exists, notExists
  - Manejo de operadores desconocidos
  
- ✅ `evaluateRule()` - 4 tests
  - Match type: all (todas las condiciones)
  - Match type: any (cualquier condición)
  - Reglas vacías
  
- ✅ `shouldShowComponent()` - 3 tests
  - Mostrar/ocultar basado en reglas
  - Valores por defecto
  
- ✅ `applyConditionalStyles()` - 2 tests
  - Merge de estilos condicionales
  - Base styles cuando no hay reglas activas

**Casos cubiertos**:
- ✅ Evaluación de condiciones simples
- ✅ Evaluación de condiciones complejas (múltiples)
- ✅ Lógica AND (matchType: 'all')
- ✅ Lógica OR (matchType: 'any')
- ✅ Merge de estilos condicionales
- ✅ Visibilidad condicional de componentes

---

### PerformanceOptimizations (7 tests)

**Funciones probadas**:
- ✅ `debounce()` - 3 tests
  - Delay de ejecución
  - Reset de timer en llamadas múltiples
  - Paso de argumentos
  
- ✅ `throttle()` - 4 tests
  - Ejecución inmediata en primera llamada
  - Prevención durante throttle period
  - Ejecución después del período
  - Paso de argumentos

**Casos cubiertos**:
- ✅ Debouncing de funciones (delay)
- ✅ Throttling de funciones (rate limiting)
- ✅ Preservación de argumentos
- ✅ Manejo de timers con vitest fake timers

---

## 🛠️ Configuración

### vitest.config.ts
```typescript
{
  environment: 'jsdom',          // DOM simulation
  globals: true,                 // Global test APIs
  setupFiles: './tests/setup.ts' // Setup file
}
```

### tests/setup.ts
- Limpieza automática después de cada test
- Mock de `window.matchMedia`
- Importación de `@testing-library/jest-dom`

---

## 📝 Escribir Nuevos Tests

### Template básico

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../utils/myUtil';

describe('MyUtil', () => {
  describe('myFunction', () => {
    it('should do something', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = myFunction(null);
      expect(result).toBeNull();
    });
  });
});
```

### Mejores Prácticas

1. **Nombrado descriptivo**
   ```typescript
   ✅ it('should return true when all conditions pass')
   ❌ it('test 1')
   ```

2. **Un concepto por test**
   ```typescript
   ✅ it('should validate email format')
   ✅ it('should reject invalid emails')
   ❌ it('should validate and process email')
   ```

3. **Arrange-Act-Assert**
   ```typescript
   it('should do something', () => {
     // Arrange
     const input = 'test';
     
     // Act
     const result = myFunction(input);
     
     // Assert
     expect(result).toBe('expected');
   });
   ```

4. **Usar mocks cuando sea necesario**
   ```typescript
   import { vi } from 'vitest';
   
   const mockFn = vi.fn();
   mockFn.mockReturnValue('mocked');
   ```

5. **Fake timers para async**
   ```typescript
   import { vi } from 'vitest';
   
   beforeEach(() => {
     vi.useFakeTimers();
   });
   
   afterEach(() => {
     vi.useRealTimers();
   });
   ```

---

## 🎯 Qué Testear

### ✅ Prioritario
- Lógica de negocio crítica
- Funciones puras (input → output)
- Validaciones y transformaciones
- Edge cases y error handling

### ⚠️ Opcional
- Componentes UI (mejor con tests de integración)
- Funciones triviales (getters/setters simples)
- Third-party code

### ❌ No Testear
- Configuración de Firebase
- Importaciones
- Tipos TypeScript (ya validados por el compilador)

---

## 🐛 Debugging Tests

### Ver output detallado
```bash
npm test -- --reporter=verbose
```

### Solo tests que fallan
```bash
npm test -- --reporter=verbose --bail
```

### Con breakpoints (VS Code)
1. Agregar `debugger;` en el test
2. F5 o Debug → JavaScript Debug Terminal
3. Ejecutar test en la terminal de debug

### Logs en tests
```typescript
it('should work', () => {
  console.log('Debug info:', someValue);
  expect(someValue).toBe(expected);
});
```

---

## 📚 Recursos

### Vitest
- [Docs oficiales](https://vitest.dev/)
- [API Reference](https://vitest.dev/api/)
- [Config](https://vitest.dev/config/)

### Testing Library
- [Queries](https://testing-library.com/docs/queries/about)
- [User Events](https://testing-library.com/docs/user-event/intro)
- [Jest-DOM matchers](https://github.com/testing-library/jest-dom)

### Mejores Prácticas
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 📊 Métricas de Calidad

### Coverage Goals
- **Utilidades**: 80%+ coverage
- **Lógica de negocio**: 90%+ coverage
- **UI Components**: 60%+ coverage

### Performance
- Tests rápidos: < 100ms por test
- Suite completa: < 10s
- Watch mode: < 1s para re-run

---

## 🔮 Próximos Tests a Agregar

### Alta Prioridad
1. **componentValidator.ts** - Validación de componentes
2. **abTestingEngine.ts** - Motor de A/B testing
3. **permissionsManager.ts** - Sistema de permisos

### Media Prioridad
4. **thumbnailGenerator.ts** - Generación de thumbnails
5. **Hooks personalizados** - useClickOutside, etc
6. **Context providers** - EditorContext (mocked)

### Baja Prioridad
7. **Integration tests** - Workflows completos
8. **E2E tests** - User journeys
9. **Visual regression** - Snapshot testing de componentes

---

## 🎉 Estado Actual

✅ **24 tests pasando**  
✅ **0 tests fallando**  
✅ **2 archivos de test**  
✅ **Cobertura de funciones críticas**  
✅ **CI-ready**

**Próximo paso**: Continuar agregando tests para más utilidades según se necesiten.

---

<p align="center">
  <strong>Tests setup completado ✅</strong>
</p>

<p align="center">
  <em>Vitest + Testing Library + TypeScript</em>
</p>

