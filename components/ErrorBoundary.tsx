import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Oups, une erreur est survenue</h1>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              L'application a rencontré un problème inattendu. Nos équipes ont été notifiées.
            </p>
            
            {this.state.error && process.env.NODE_ENV === 'development' && (
                <div className="bg-slate-100 p-3 rounded text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-slate-700">
                    {this.state.error.toString()}
                </div>
            )}

            <Button 
                onClick={() => window.location.reload()} 
                className="w-full justify-center shadow-lg shadow-indigo-100"
                icon={RefreshCw}
            >
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
