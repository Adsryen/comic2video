import React from "react";
import Routing from "./routing/Routing";
import CursorGlow from "./layout/CursorGlow";
import AnimatedBackground from "./components/home/AnimatedBackground";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toastContainerConfig } from './utils/toast';

function App() {
  return (
    <>
      {/* Global cursor glow */}  
      <CursorGlow />
      <AnimatedBackground/>  
      
      {/* App routing */}
      <Routing />
      
      {/* Toast notifications with glassmorphism styling */}
      <ToastContainer {...toastContainerConfig} />
    </>
  );
}

export default App;