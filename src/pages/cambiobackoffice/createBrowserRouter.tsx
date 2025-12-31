import { createBrowserRouter } from 'react-router-dom';
import { CambioPage } from './CambioPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CambioPage />,
  },
  {
    path: '/cambio',
    element: <CambioPage />,
  },
]);