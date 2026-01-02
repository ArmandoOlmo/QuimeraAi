/**
 * Admin Page to Seed Help Center Articles
 * Navigate to /admin/seed-articles to use this page
 */

import React, { useState, useEffect } from 'react';
import {
    collection,
    doc,
    writeBatch,
    getDocs,
    query,
    where,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

// Import comprehensive article data
import { ALL_HELP_ARTICLES } from '../../data/helpArticles';

export default function SeedArticlesPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [existingCount, setExistingCount] = useState<number | null>(null);

    const checkExisting = async () => {
        try {
            const collectionPath = 'appContent/data/articles';
            const q = query(
                collection(db, collectionPath),
                where('category', 'in', ['help', 'guide', 'tutorial'])
            );
            const snapshot = await getDocs(q);
            setExistingCount(snapshot.size);
            return snapshot.size;
        } catch (error) {
            console.error('Error checking articles:', error);
            return 0;
        }
    };

    const seedArticles = async () => {
        setStatus('loading');
        setMessage('Preparando artículos...');
        setProgress(0);

        try {
            const collectionPath = 'appContent/data/articles';
            const now = new Date().toISOString();
            const totalArticles = ALL_HELP_ARTICLES.length;

            let count = 0;

            // Process in batches of 10 to avoid Firestore limits
            const batchSize = 10;
            for (let i = 0; i < totalArticles; i += batchSize) {
                const batch = writeBatch(db);
                const batchArticles = ALL_HELP_ARTICLES.slice(i, i + batchSize);

                for (const article of batchArticles) {
                    const articleId = `help_${article.slug.replace(/-/g, '_')}_${Date.now() + count}`;
                    const docRef = doc(db, collectionPath, articleId);

                    // Calculate read time based on word count
                    const wordCount = article.content.split(/\s+/).length;
                    const readTime = Math.max(1, Math.ceil(wordCount / 200));

                    const fullArticle = {
                        ...article,
                        id: articleId,
                        readTime,
                        views: Math.floor(Math.random() * 150) + 20,
                        createdAt: now,
                        updatedAt: now,
                        publishedAt: now,
                    };

                    batch.set(docRef, fullArticle);
                    count++;
                }

                await batch.commit();
                
                const progressPercent = Math.round((count / totalArticles) * 100);
                setProgress(progressPercent);
                setMessage(`Creando artículos... ${count}/${totalArticles}`);
            }

            setStatus('success');
            setMessage(`✅ ¡${count} artículos creados exitosamente!`);
            await checkExisting();
        } catch (error) {
            console.error('Error:', error);
            setStatus('error');
            setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    const deleteArticles = async () => {
        setStatus('loading');
        setMessage('Eliminando artículos existentes...');
        setProgress(0);

        try {
            const collectionPath = 'appContent/data/articles';
            const q = query(
                collection(db, collectionPath),
                where('category', 'in', ['help', 'guide', 'tutorial'])
            );
            const snapshot = await getDocs(q);
            const total = snapshot.docs.length;
            let deleted = 0;

            for (const docSnapshot of snapshot.docs) {
                await deleteDoc(docSnapshot.ref);
                deleted++;
                setProgress(Math.round((deleted / total) * 100));
                setMessage(`Eliminando... ${deleted}/${total}`);
            }

            setStatus('success');
            setMessage(`🗑️ ${deleted} artículos eliminados.`);
            setExistingCount(0);
        } catch (error) {
            console.error('Error:', error);
            setStatus('error');
            setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    useEffect(() => {
        checkExisting();
    }, []);

    // Calculate article stats
    const articlesByCategory = ALL_HELP_ARTICLES.reduce((acc, article) => {
        acc[article.category] = (acc[article.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">📚</div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Seed Help Center Articles
                    </h1>
                    <p className="text-zinc-400">
                        Artículos completos y detallados para el Help Center
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Artículos a crear</p>
                        <p className="text-3xl font-bold text-yellow-400">{ALL_HELP_ARTICLES.length}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Existentes en DB</p>
                        <p className="text-3xl font-bold text-blue-400">
                            {existingCount !== null ? existingCount : '...'}
                        </p>
                    </div>
                </div>

                {/* Category breakdown */}
                <div className="bg-zinc-800/30 rounded-xl p-4 mb-8">
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Artículos por categoría:</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(articlesByCategory).map(([category, count]) => (
                            <div key={category} className="flex justify-between text-zinc-300">
                                <span className="capitalize">{category}</span>
                                <span className="text-yellow-400 font-medium">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress bar */}
                {status === 'loading' && (
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-zinc-400 mb-2">
                            <span>{message}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-yellow-400 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                    <button
                        onClick={seedArticles}
                        disabled={status === 'loading'}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {status === 'loading' ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span>Crear {ALL_HELP_ARTICLES.length} Artículos Detallados</span>
                            </>
                        )}
                    </button>

                    {existingCount !== null && existingCount > 0 && (
                        <button
                            onClick={deleteArticles}
                            disabled={status === 'loading'}
                            className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-medium py-3 px-6 rounded-xl transition-all duration-200"
                        >
                            🗑️ Eliminar {existingCount} artículos existentes
                        </button>
                    )}
                </div>

                {/* Result message */}
                {message && status !== 'loading' && (
                    <div className={`mt-6 p-4 rounded-xl text-center ${
                        status === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                        status === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                        'bg-zinc-800 text-zinc-400'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Article preview */}
                <div className="mt-8 pt-6 border-t border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-4">Artículos incluidos:</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {ALL_HELP_ARTICLES.map((article, index) => (
                            <div 
                                key={index}
                                className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-zinc-800/50"
                            >
                                <span className="text-yellow-400 mt-0.5">
                                    {article.category === 'tutorial' ? '📖' : 
                                     article.category === 'guide' ? '📋' : '❓'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{article.title}</p>
                                    <p className="text-zinc-500 text-xs truncate">{article.excerpt}</p>
                                </div>
                                <span className="text-xs text-zinc-600 whitespace-nowrap">
                                    {Math.ceil(article.content.split(/\s+/).length / 200)} min
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="mt-6 pt-6 border-t border-zinc-800 flex gap-4">
                    <a 
                        href="/help-center" 
                        className="flex-1 text-center py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                    >
                        📖 Ver Help Center
                    </a>
                    <a 
                        href="/" 
                        className="flex-1 text-center py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                    >
                        🏠 Ir al inicio
                    </a>
                </div>
            </div>
        </div>
    );
}
