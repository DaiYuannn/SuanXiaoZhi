import React from 'react';
import { RouterProvider } from 'react-router-dom';
import appRouter from './router';
import AssistantPanel from './components/AssistantPanel';

const App: React.FC = () => {
  return (
    <>
      <RouterProvider router={appRouter} />
      <AssistantPanel />
    </>
  );
};

export default App;