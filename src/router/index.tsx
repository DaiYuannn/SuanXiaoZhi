import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { auditNav } from '../analytics/audit';
import { useEffect, lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import MobileTabBar from '../components/MobileTabBar';

import P_login from '../pages/p-login';
import P_register from '../pages/p-register';
import P_home from '../pages/p-home';
import P_accounting from '../pages/p-accounting';
import P_consumption_analysis from '../pages/p-consumption_analysis';
const P_financial_planning = lazy(() => import('../pages/p-financial_planning'));
import P_financial_products from '../pages/p-financial_products';
const P_customer_service = lazy(() => import('../pages/p-customer_service'));
import P_user_settings from '../pages/p-user_settings';
import P_transaction_detail from '../pages/p-transaction_detail';
import P_add_transaction from '../pages/p-add_transaction';
const P_product_detail = lazy(() => import('../pages/p-product_detail'));
import P_risk_assessment from '../pages/p-risk_assessment';
import P_bill_upload from '../pages/p-bill_upload';
import P_incentive_center from '../pages/p-incentive_center';
import P_family from '../pages/p-family';
import NotFoundPage from './NotFoundPage';
import ErrorPage from './ErrorPage';

import MainLayout from '../components/MainLayout';

function Listener() {
  const location = useLocation();
  useEffect(() => {
    const pageId = 'P-' + location.pathname.replace('/', '').toUpperCase();
  console.log('当前pageId:', pageId, ', pathname:', location.pathname, ', search:', location.search);
  auditNav(location.pathname);
    if (typeof window === 'object' && window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'chux-path-change',
        pageId: pageId,
        pathname: location.pathname,
        search: location.search,
      }, '*');
    }
  }, [location]);

  return <Outlet />;
}

// 使用 createBrowserRouter 创建路由实例
const router = createBrowserRouter([
  {
    path: '/',
    element: <Listener />,
    children: [
      {
        path: '/',
        element: <Navigate to='/login' replace={true} />,
      },
      {
        path: '/login',
        element: (
          <ErrorBoundary>
            <P_login />
          </ErrorBoundary>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: '/register',
        element: (
          <ErrorBoundary>
            <P_register />
          </ErrorBoundary>
        ),
        errorElement: <ErrorPage />,
      },
      {
        element: <MainLayout />,
        children: [
          {
            path: '/home',
            element: (
              <ErrorBoundary>
                <P_home />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/accounting',
            element: (
              <ErrorBoundary>
                <P_accounting />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/consumption-analysis',
            element: (
              <ErrorBoundary>
                <P_consumption_analysis />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/financial-planning',
            element: (
              <ErrorBoundary>
                <Suspense fallback={<div className="p-6 text-center text-text-secondary">加载中...</div>}>
                  <P_financial_planning />
                </Suspense>
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/financial-products',
            element: (
              <ErrorBoundary>
                <P_financial_products />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/customer-service',
            element: (
              <ErrorBoundary>
                <Suspense fallback={<div className="p-6 text-center text-text-secondary">加载中...</div>}>
                  <P_customer_service />
                </Suspense>
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/user-settings',
            element: (
              <ErrorBoundary>
                <P_user_settings />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/transaction-detail',
            element: (
              <ErrorBoundary>
                <P_transaction_detail />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/add-transaction',
            element: (
              <ErrorBoundary>
                <P_add_transaction />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/product-detail',
            element: (
              <ErrorBoundary>
                <Suspense fallback={<div className="p-6 text-center text-text-secondary">加载中...</div>}>
                  <P_product_detail />
                </Suspense>
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/risk-assessment',
            element: (
              <ErrorBoundary>
                <P_risk_assessment />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/bill-upload',
            element: (
              <ErrorBoundary>
                <P_bill_upload />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/incentive-center',
            element: (
              <ErrorBoundary>
                <P_incentive_center />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
          {
            path: '/family',
            element: (
              <ErrorBoundary>
                <P_family />
              </ErrorBoundary>
            ),
            errorElement: <ErrorPage />,
          },
        ]
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ]
  }
]);

export default router;