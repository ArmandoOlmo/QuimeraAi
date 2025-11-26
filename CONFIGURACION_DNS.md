# 🌐 Configuración de Dominio: quimera.ai

He configurado el mapeo de dominio en Cloud Run para tu aplicación. Para que funcione correctamente, debes actualizar los registros DNS en tu proveedor de dominio con la siguiente información:

## 1. Dominio Principal (@ o quimera.ai)
Elimina cualquier registro A o AAAA existente y añade los siguientes:

| Tipo | Host | Valor |
|------|------|-------|
| **A** | @ | `216.239.32.21` |
| **A** | @ | `216.239.34.21` |
| **A** | @ | `216.239.36.21` |
| **A** | @ | `216.239.38.21` |
| **AAAA** | @ | `2001:4860:4802:32::15` |
| **AAAA** | @ | `2001:4860:4802:34::15` |
| **AAAA** | @ | `2001:4860:4802:36::15` |
| **AAAA** | @ | `2001:4860:4802:38::15` |

## 2. Subdominio (www)
Asegúrate de tener este registro CNAME:

| Tipo | Host | Valor |
|------|------|-------|
| **CNAME** | www | `ghs.googlehosted.com.` |

> **Nota:** La propagación de DNS puede tardar desde unos minutos hasta 24 horas. Google gestionará automáticamente el certificado SSL una vez que los DNS apunten correctamente.
