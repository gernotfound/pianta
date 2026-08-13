import { useState } from 'react';
import { useStore } from '../store';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';

const ExpensesTab = () => {
    const user = useStore(state => state.user);
    const expenses = useStore(state => state.generalExpenses);
    
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Pianta');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const total = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleAddExpense = async () => {
        if (!date || !amount || isNaN(amount)) {
            Swal.fire('Errore', 'Inserisci una data e un importo valido.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'users', user.uid, 'expenses'), {
                date,
                amount: parseFloat(amount),
                category,
                description
            });
            Swal.fire({ icon: 'success', title: 'Spesa salvata', timer: 1000, showConfirmButton: false });
            setAmount('');
            setDescription('');
        } catch (e) {
            Swal.fire('Errore', 'Impossibile salvare la spesa.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: 'Eliminare questa spesa?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33'
        });
        if (res.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
            } catch (e) {
                Swal.fire('Errore', 'Impossibile eliminare la spesa.', 'error');
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--primary)', margin: 0 }}>💰 Gestione Spese</h3>
                <div style={{ background: 'var(--surface)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                    Totale: {total.toFixed(2)} €
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0' }}>Nuova Spesa</h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>Data</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Importo (€)</label>
                        <input type="number" inputMode="decimal" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label>Categoria</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
                            <option value="Pianta">Pianta</option>
                            <option value="Vaso">Vaso</option>
                            <option value="Terriccio">Terriccio / Substrato</option>
                            <option value="Concime">Concime / Trattamenti</option>
                            <option value="Attrezzatura">Attrezzatura</option>
                            <option value="Spedizione">Spedizione</option>
                            <option value="Altro">Altro</option>
                        </select>
                    </div>
                    <div style={{ flex: 2 }}>
                        <label>Descrizione</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Es. Monstera Albo" style={{ width: '100%' }} />
                    </div>
                </div>

                <button className="btn btn-warning" onClick={handleAddExpense} disabled={isSaving} style={{ width: '100%', margin: 0 }}>
                    {isSaving ? 'Salvataggio...' : '➕ Aggiungi Spesa'}
                </button>
            </div>

            {sortedExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    Nessuna spesa registrata.
                </div>
            ) : (
                <ul className="timeline">
                    {sortedExpenses.map(expense => (
                        <li key={expense.id} className="timeline-item" style={{ paddingBottom: '15px' }}>
                            <div className="timeline-icon">💸</div>
                            <div className="timeline-content" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="timeline-date">{new Date(expense.date).toLocaleDateString('it-IT')}</div>
                                    <div className="timeline-type">{expense.category}</div>
                                    <div className="timeline-details">{expense.description}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--danger)' }}>- {parseFloat(expense.amount).toFixed(2)} €</div>
                                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '11px', marginTop: '5px' }} onClick={() => handleDelete(expense.id)}>Elimina</button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ExpensesTab;
