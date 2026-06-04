// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">页面出错了</h2>
            <p className="text-gray-500 text-sm mb-6">{this.state.error?.message ?? '未知错误'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
