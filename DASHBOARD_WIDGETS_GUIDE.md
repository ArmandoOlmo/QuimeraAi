# 🎛️ Guía de Widgets para Super Admin Dashboard

## 📦 Componentes Adicionales Creados

Se han creado 3 widgets complementarios que pueden integrarse al Super Admin Dashboard para una experiencia más completa.

---

## 1. 🚀 QuickAccessPanel

### **Descripción**
Panel de acceso rápido que muestra las funcionalidades más utilizadas por el administrador.

### **Características**
- ⭐ Muestra las funciones favoritas o más usadas
- 🕐 Indica última vez que se accedió
- 📊 Muestra popularidad con badge "Popular"
- 📱 Grid responsive (2/3/6 columnas)
- ✨ Animaciones hover suaves

### **Props**
```typescript
interface QuickAccessPanelProps {
    items: QuickAccessItem[];       // Lista de items a mostrar
    onItemClick: (id: string) => void;  // Handler al hacer click
    maxItems?: number;              // Máximo de items (default: 6)
}

interface QuickAccessItem {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    lastAccessed?: string;         // ej: "Hace 2h"
    frequency?: number;            // Número de accesos
}
```

### **Uso**
```typescript
import QuickAccessPanel from './admin/QuickAccessPanel';

const quickAccessItems = [
    {
        id: 'components',
        title: 'Components',
        icon: <Puzzle size={20} />,
        description: 'Manage components',
        lastAccessed: 'Hace 1h',
        frequency: 45
    },
    // ... más items
];

<QuickAccessPanel 
    items={quickAccessItems}
    onItemClick={handleCardClick}
    maxItems={6}
/>
```

### **Ubicación Recomendada**
Justo después de las StatCards y antes de la búsqueda.

---

## 2. 📊 ActivityTimeline

### **Descripción**
Timeline que muestra las actividades recientes del sistema con información de usuario y timestamp.

### **Características**
- 🕐 Timeline visual con línea conectora
- 🎨 Colores por severidad (info, success, warning, error)
- 👤 Información de usuario que realizó la acción
- 🏷️ Iconos por tipo de actividad
- 📱 Totalmente responsive

### **Props**
```typescript
interface ActivityTimelineProps {
    activities: Activity[];        // Lista de actividades
    maxItems?: number;            // Máximo visible (default: 5)
    onViewAll?: () => void;       // Handler para "Ver todo"
}

interface Activity {
    id: string;
    type: 'create' | 'edit' | 'delete' | 'config' | 'user' | 'system';
    severity: 'info' | 'success' | 'warning' | 'error';
    title: string;
    description: string;
    timestamp: string;
    user?: {
        name: string;
        email: string;
    };
}
```

### **Uso**
```typescript
import ActivityTimeline from './admin/ActivityTimeline';

const activities = [
    {
        id: '1',
        type: 'edit',
        severity: 'success',
        title: 'Componente actualizado',
        description: 'Hero component fue actualizado con nuevo diseño',
        timestamp: 'Hace 5 min',
        user: {
            name: 'Juan Pérez',
            email: 'juan@quimera.ai'
        }
    },
    // ... más actividades
];

<ActivityTimeline 
    activities={activities}
    maxItems={5}
    onViewAll={() => console.log('Ver todas')}
/>
```

### **Ubicación Recomendada**
En una columna lateral o debajo de las funcionalidades principales.

---

## 3. 🏥 SystemHealthWidget

### **Descripción**
Widget de monitoreo de salud del sistema con métricas en tiempo real.

### **Características**
- 🟢 Estados: healthy, degraded, down
- 📊 Barras de progreso para carga y almacenamiento
- 🔄 Botón de refresh
- 📡 Monitoreo de API y Database
- ⏱️ Uptime y última verificación

### **Props**
```typescript
interface SystemHealthWidgetProps {
    health: SystemHealth;
    onRefresh?: () => void;
}

interface SystemHealth {
    apiStatus: 'healthy' | 'degraded' | 'down';
    databaseStatus: 'healthy' | 'degraded' | 'down';
    serverLoad: number;              // 0-100
    storageUsed: number;             // 0-100
    uptime: string;                  // ej: "15d 4h"
    lastCheck: string;               // ej: "Hace 30s"
    activeConnections?: number;
    requestsPerMinute?: number;
}
```

### **Uso**
```typescript
import SystemHealthWidget from './admin/SystemHealthWidget';

const systemHealth = {
    apiStatus: 'healthy',
    databaseStatus: 'healthy',
    serverLoad: 45,
    storageUsed: 68,
    uptime: '15d 4h 23m',
    lastCheck: 'Hace 30s',
    activeConnections: 234,
    requestsPerMinute: 1250
};

<SystemHealthWidget 
    health={systemHealth}
    onRefresh={() => fetchHealthData()}
/>
```

### **Ubicación Recomendada**
En la columna lateral o en un dashboard tab separado de "System".

---

## 📐 Layouts Recomendados

### **Layout 1: Dashboard Completo**
```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├─────────────────────────────────────────────────────┤
│ StatCards (x4)                                      │
├─────────────────────────────────────────────────────┤
│ QuickAccessPanel                                    │
├─────────────────────────────────────────────────────┤
│ Search & Filters                                    │
├─────────────────────────────────────────────────────┤
│ Features Grid                                       │
└─────────────────────────────────────────────────────┘
```

### **Layout 2: Dashboard con Sidebar**
```
┌──────────────────────────┬────────────────────────┐
│ Header                                            │
├──────────────────────────┼────────────────────────┤
│ StatCards (x4)                                    │
├──────────────────────────┬────────────────────────┤
│                          │                        │
│ Main Content             │  Sidebar               │
│ - QuickAccess            │  - ActivityTimeline    │
│ - Search                 │  - SystemHealth        │
│ - Features Grid          │                        │
│                          │                        │
└──────────────────────────┴────────────────────────┘
```

### **Layout 3: Dashboard con Tabs**
```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├─────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Activity] [System] [Settings]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Tab Content (condicionalmente renderizado)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Integración Paso a Paso

### **Paso 1: Importar Widgets**
```typescript
import QuickAccessPanel from './admin/QuickAccessPanel';
import ActivityTimeline from './admin/ActivityTimeline';
import SystemHealthWidget from './admin/SystemHealthWidget';
```

### **Paso 2: Agregar Estados**
```typescript
const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([]);
const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
const [systemHealth, setSystemHealth] = useState<SystemHealth>(defaultHealth);
```

### **Paso 3: Cargar Datos (useEffect)**
```typescript
useEffect(() => {
    // Cargar quick access desde localStorage o API
    const loadQuickAccess = () => {
        const saved = localStorage.getItem('quickAccess');
        if (saved) setQuickAccessItems(JSON.parse(saved));
    };

    // Cargar actividad reciente desde API
    const loadActivities = async () => {
        const activities = await fetchRecentActivities();
        setRecentActivities(activities);
    };

    // Cargar salud del sistema
    const loadSystemHealth = async () => {
        const health = await fetchSystemHealth();
        setSystemHealth(health);
    };

    loadQuickAccess();
    loadActivities();
    loadSystemHealth();

    // Polling para system health cada 30s
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
}, []);
```

### **Paso 4: Renderizar en Layout**
```typescript
<main className="flex-1 overflow-y-auto">
    <div className="p-4 sm:p-6 lg:p-8">
        {/* StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* ... StatCards ... */}
        </div>

        {/* Layout con sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
                {/* Quick Access */}
                <QuickAccessPanel 
                    items={quickAccessItems}
                    onItemClick={handleCardClick}
                />

                {/* Search & Filters */}
                {/* ... búsqueda y filtros ... */}

                {/* Features Grid */}
                {/* ... grid de funcionalidades ... */}
            </div>

            {/* Sidebar - 1/3 */}
            <div className="space-y-6">
                {/* System Health */}
                <SystemHealthWidget 
                    health={systemHealth}
                    onRefresh={loadSystemHealth}
                />

                {/* Activity Timeline */}
                <ActivityTimeline 
                    activities={recentActivities}
                    maxItems={5}
                    onViewAll={() => setAdminView('activity-log')}
                />
            </div>
        </div>
    </div>
</main>
```

---

## 📊 Datos de Ejemplo (Mock Data)

### **Quick Access**
```typescript
const mockQuickAccess: QuickAccessItem[] = [
    {
        id: 'components',
        title: 'Components',
        icon: <Puzzle size={20} />,
        description: 'Manage components',
        lastAccessed: 'Hace 1h',
        frequency: 45
    },
    {
        id: 'templates',
        title: 'Templates',
        icon: <LayoutTemplate size={20} />,
        description: 'Website templates',
        lastAccessed: 'Hace 3h',
        frequency: 32
    },
    // ... más items
];
```

### **Activities**
```typescript
const mockActivities: Activity[] = [
    {
        id: '1',
        type: 'edit',
        severity: 'success',
        title: 'Componente actualizado',
        description: 'Hero component fue actualizado con nuevo diseño',
        timestamp: 'Hace 5 min',
        user: {
            name: 'Juan Pérez',
            email: 'juan@example.com'
        }
    },
    {
        id: '2',
        type: 'create',
        severity: 'info',
        title: 'Nuevo template creado',
        description: 'Template "E-commerce Pro" agregado a la biblioteca',
        timestamp: 'Hace 15 min',
        user: {
            name: 'María García',
            email: 'maria@example.com'
        }
    },
    // ... más actividades
];
```

### **System Health**
```typescript
const mockSystemHealth: SystemHealth = {
    apiStatus: 'healthy',
    databaseStatus: 'healthy',
    serverLoad: 45,
    storageUsed: 68,
    uptime: '15d 4h 23m',
    lastCheck: 'Hace 30s',
    activeConnections: 234,
    requestsPerMinute: 1250
};
```

---

## 🎨 Personalización

### **Colores**
Todos los widgets usan las variables CSS del tema:
- `editor-accent` - Color primario
- `editor-bg` - Fondo principal
- `editor-panel-bg` - Fondo de paneles
- `editor-border` - Bordes
- `editor-text-primary` - Texto principal
- `editor-text-secondary` - Texto secundario

### **Tamaños**
Puedes ajustar:
- `maxItems` en QuickAccessPanel y ActivityTimeline
- Columnas del grid en QuickAccessPanel
- Altura de las barras de progreso

### **Iconos**
Usa cualquier icono de `lucide-react` cambiando el prop `icon`.

---

## 🚀 Features Avanzadas

### **1. Persistencia de Quick Access**
```typescript
// Guardar en localStorage al cambiar
useEffect(() => {
    localStorage.setItem('quickAccess', JSON.stringify(quickAccessItems));
}, [quickAccessItems]);

// Tracking de uso
const handleCardClick = (id: string) => {
    // Incrementar frecuencia
    setQuickAccessItems(items => 
        items.map(item => 
            item.id === id 
                ? { ...item, frequency: (item.frequency || 0) + 1, lastAccessed: 'Ahora' }
                : item
        )
    );
    
    // Navegar
    setAdminView(id);
};
```

### **2. Real-time Activity Stream**
```typescript
// WebSocket o polling para actividades
useEffect(() => {
    const unsubscribe = subscribeToActivityStream((newActivity) => {
        setRecentActivities(prev => [newActivity, ...prev].slice(0, 50));
    });
    
    return unsubscribe;
}, []);
```

### **3. System Health Alerts**
```typescript
// Mostrar notificación si el sistema está degradado
useEffect(() => {
    if (systemHealth.apiStatus === 'down' || systemHealth.databaseStatus === 'down') {
        showNotification({
            type: 'error',
            title: 'Sistema Caído',
            message: 'Se detectó un problema en el sistema'
        });
    }
}, [systemHealth]);
```

---

## ✅ Checklist de Implementación

- [ ] Importar los 3 widgets
- [ ] Agregar estados necesarios
- [ ] Crear funciones de carga de datos
- [ ] Implementar layout (elegir uno de los 3)
- [ ] Conectar handlers de eventos
- [ ] Agregar datos mock para testing
- [ ] Implementar persistencia (localStorage/API)
- [ ] Agregar polling para datos en tiempo real
- [ ] Testear responsive en móvil/tablet
- [ ] Optimizar rendimiento (memo, useMemo)

---

## 📚 Referencias

- **QuickAccessPanel.tsx** - Panel de acceso rápido
- **ActivityTimeline.tsx** - Timeline de actividades
- **SystemHealthWidget.tsx** - Widget de salud del sistema
- **SuperAdminDashboardImproved.tsx** - Dashboard mejorado base

---

**Nota**: Estos componentes son opcionales y pueden integrarse de forma modular según las necesidades específicas de tu aplicación.


