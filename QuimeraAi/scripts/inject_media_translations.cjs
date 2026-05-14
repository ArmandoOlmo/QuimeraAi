const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'locales');

const newTranslations = {
    "superadmin": {
        "mediaManager": {
            "en": "Media Library",
            "es": "Librería de Medios"
        },
        "media": {
            "platformAssets": {
                "en": "Platform Assets",
                "es": "Assets de Plataforma"
            },
            "globalAssets": {
                "en": "Global Assets",
                "es": "Archivos Globales"
            },
            "tenantAssets": {
                "en": "User Uploads",
                "es": "Archivos de Usuarios"
            }
        },
        "tenantMedia": {
            "title": {
                "en": "User & Restaurant Files",
                "es": "Archivos de Usuarios y Restaurantes"
            },
            "searchPlaceholder": {
                "en": "Search by file name or tenant ID...",
                "es": "Buscar por nombre o ID de inquilino..."
            },
            "noFiles": {
                "en": "No files found",
                "es": "No se encontraron archivos"
            },
            "fileDetails": {
                "en": "File Details",
                "es": "Detalles del Archivo"
            },
            "tenant": {
                "en": "Tenant",
                "es": "Inquilino"
            },
            "project": {
                "en": "Project",
                "es": "Proyecto"
            }
        }
    }
};

const mergeDeep = (target, source, lang) => {
    const isObject = (obj) => obj && typeof obj === 'object';
    
    if (!isObject(target) || !isObject(source)) {
        return source;
    }
    
    Object.keys(source).forEach(key => {
        const targetValue = target[key];
        const sourceValue = source[key];
        
        if (Array.isArray(sourceValue)) {
            target[key] = sourceValue;
        } else if (isObject(sourceValue)) {
            // If the source value contains 'en' and 'es', it's a leaf node for our script
            if ('en' in sourceValue && 'es' in sourceValue) {
                target[key] = sourceValue[lang];
            } else {
                target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue, lang);
            }
        } else {
            target[key] = sourceValue;
        }
    });
    
    return target;
};

['en', 'es'].forEach(lang => {
    const filePath = path.join(localesPath, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
        console.log(`Updating ${lang} translations...`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const updatedData = mergeDeep(data, newTranslations, lang);
        
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`Updated ${filePath}`);
    }
});
