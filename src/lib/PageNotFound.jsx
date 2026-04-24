import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background cyber-grid">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-7xl font-heading font-bold text-primary neon-text-cyan">404</h1>
                        <div className="h-0.5 w-16 bg-primary/30 mx-auto"></div>
                    </div>
                    
                    <div className="space-y-3">
                        <h2 className="text-2xl font-heading font-bold tracking-wider text-foreground">
                            SIGNAL LOST
                        </h2>
                        <p className="text-muted-foreground font-body leading-relaxed">
                            Node <span className="font-mono text-primary">"{pageName}"</span> not found in the network.
                        </p>
                    </div>
                    
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-card rounded border border-primary/20 neon-glow-cyan">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-mono font-medium text-primary">Admin Note</p>
                                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                                        This page hasn't been implemented yet. Ask the AI to create it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-6 py-2.5 text-xs font-mono tracking-widest text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors neon-glow-cyan"
                        >
                            RETURN TO BASE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}