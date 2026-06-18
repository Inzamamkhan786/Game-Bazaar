import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppFloat from '../ui/WhatsAppFloat';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Layout;
