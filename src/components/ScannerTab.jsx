import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

const ScannerTab = () => {
    const navigate = useNavigate();
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
        });

        scanner.render(
            (decodedText) => {
                // If it's a valid ID, navigate to it. Assuming decodedText is the plant ID
                scanner.clear();
                navigate(`/plants/${decodedText}`);
            },
            (error) => {
                // ignoring errors as it scans continuously
            }
        );

        return () => {
            scanner.clear().catch(e => console.error("Scanner clear error", e));
        };
    }, [navigate]);

    return (
        <div>
            <h3 style={{ color: 'var(--primary)', marginTop: 0 }}>🏷️ Scanner QR Etichette</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Inquadra il codice QR presente sul vaso per aprire direttamente la scheda della pianta.
            </p>
            
            <div id="reader" ref={scannerRef} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', border: 'none' }}></div>
        </div>
    );
};

export default ScannerTab;
