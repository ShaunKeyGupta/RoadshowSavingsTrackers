import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, X, FileText, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    // The 'shows' state is now initialized by reading from the browser's localStorage.
    const [shows, setShows] = useState(() => {
        try {
            const localData = localStorage.getItem('roadshow-savings-data');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return [];
        }
    });

    const [isLoading, setIsLoading] = useState(false); // Loading is much faster now
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShow, setEditingShow] = useState(null);
    const [selectedShow, setSelectedShow] = useState(null);
    const [error, setError] = useState(null);

    // --- Constants ---
    const ROOM_BUDGET_PER_NIGHT = 100;
    const MEETING_BUDGET_PER_DAY = 100;
    const COMMISSION_RATE = 0.20;

    // --- Data Persistence using localStorage ---
    // This effect runs whenever the 'shows' state changes, saving the updated data to localStorage.
    useEffect(() => {
        try {
            localStorage.setItem('roadshow-savings-data', JSON.stringify(shows));
        } catch (error) {
            console.error("Error writing to localStorage", error);
            setError("Could not save data to your browser's storage.");
        }
    }, [shows]);

    // --- Calculations ---
    const calculateMetrics = (show) => {
        const roomBudget = (show.nights || 0) * ROOM_BUDGET_PER_NIGHT;
        const meetingBudget = (show.meetingDays || 0) * MEETING_BUDGET_PER_DAY;
        const totalBudget = roomBudget + meetingBudget;
        const actualSpend = (show.actualRoomCost || 0) + (show.actualMeetingCost || 0);
        const savings = totalBudget - actualSpend;
        const commission = savings > 0 ? savings * COMMISSION_RATE : 0;
        return { totalBudget, actualSpend, savings, commission };
    };
    
    // --- Memoized Aggregate Data ---
    const aggregateData = useMemo(() => {
        return shows.reduce((acc, show) => {
            const { savings, commission, actualSpend, totalBudget } = calculateMetrics(show);
            acc.totalSavings += savings;
            acc.totalCommission += commission;
            acc.totalSpent += actualSpend;
            acc.totalBudgeted += totalBudget;
            return acc;
        }, { totalSavings: 0, totalCommission: 0, totalSpent: 0, totalBudgeted: 0 });
    }, [shows]);

    // --- Event Handlers ---
    const handleOpenModal = (show = null) => {
        setEditingShow(show);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingShow(null);
    };

    const handleSaveShow = (showData) => {
        if (editingShow) {
            // Update existing show
            setShows(shows.map(s => s.id === editingShow.id ? { ...s, ...showData } : s));
        } else {
            // Add new show with a unique ID and creation date
            const newShow = { 
                ...showData, 
                id: crypto.randomUUID(), 
                createdAt: new Date().toISOString() 
            };
            // Add the new show to the beginning of the list
            setShows([newShow, ...shows]);
        }
        handleCloseModal();
    };

    const handleDeleteShow = (showId) => {
        // Filter out the show to be deleted
        setShows(shows.filter(s => s.id !== showId));
        // If the deleted show was the selected one, go back to the list
        if (selectedShow && selectedShow.id === showId) {
            setSelectedShow(null);
        }
    };

    // --- UI Rendering ---
    if (selectedShow) {
        return <ShowDetailView show={selectedShow} onBack={() => setSelectedShow(null)} calculateMetrics={calculateMetrics} onDelete={handleDeleteShow} onEdit={handleOpenModal} />;
    }

    return (
        <div className="bg-slate-100 min-h-screen font-sans text-slate-800">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Header onAddShow={() => handleOpenModal()} />
                {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
                <DashboardStats data={aggregateData} showCount={shows.length} />

                <main>
                    <h2 className="text-2xl font-bold text-slate-700 mb-4">All Shows</h2>
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : shows.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {shows.map(show => (
                                <ShowCard 
                                    key={show.id} 
                                    show={show} 
                                    metrics={calculateMetrics(show)}
                                    onSelect={() => setSelectedShow(show)}
                                />
                            ))}
                        </div>
                    ) : (
                         <EmptyState onAddShow={() => handleOpenModal()} />
                    )}
                </main>
            </div>

            {isModalOpen && (
                <ShowFormModal
                    show={editingShow}
                    onClose={handleCloseModal}
                    onSave={handleSaveShow}
                />
            )}
        </div>
    );
}

// --- Sub-components ---
// All sub-components below are for UI and remain unchanged.

const Header = ({ onAddShow }) => (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
            <h1 className="text-4xl font-bold text-slate-900">Savings Tracker</h1>
            <p className="text-slate-500 mt-1">Monitor roadshow expenses and salesman commissions.</p>
        </div>
        <button
            onClick={onAddShow}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
            <Plus size={20} />
            Add New Show
        </button>
    </header>
);

const DashboardStats = ({ data, showCount }) => (
    <section className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Aggregate Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard 
                icon={<TrendingUp className="text-green-500" />} 
                label="Total Savings" 
                value={`$${data.totalSavings.toFixed(2)}`} 
                color="text-green-600"
            />
            <StatCard 
                icon={<DollarSign className="text-blue-500" />} 
                label="Total Commissions" 
                value={`$${data.totalCommission.toFixed(2)}`}
                color="text-blue-600"
            />
            <StatCard 
                icon={<BarChart2 className="text-purple-500" />} 
                label="Total Shows Tracked" 
                value={showCount}
                color="text-purple-600"
            />
            <StatCard 
                icon={<FileText className="text-orange-500" />} 
                label="Total Spent" 
                value={`$${data.totalSpent.toFixed(2)}`}
                color="text-orange-600"
            />
        </div>
    </section>
);

const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-4">
        <div className="bg-white p-3 rounded-full shadow-sm">{icon}</div>
        <div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    </div>
);

const ShowCard = ({ show, metrics, onSelect }) => {
    const savingsColor = metrics.savings >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    return (
        <div onClick={onSelect} className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-800 truncate pr-2">{show.destination}</h3>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${savingsColor}`}>
                        ${metrics.savings.toFixed(2)} Saved
                    </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">
                    {show.createdAt ? new Date(show.createdAt).toLocaleDateString() : 'Date not available'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-500">Commission</p>
                        <p className="font-semibold text-blue-600 text-lg">${metrics.commission.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Actual Spend</p>
                        <p className="font-semibold text-slate-700 text-lg">${metrics.actualSpend.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShowDetailView = ({ show, onBack, calculateMetrics, onDelete, onEdit }) => {
    const metrics = calculateMetrics(show);
    const savingsColor = metrics.savings >= 0 ? 'text-green-600' : 'text-red-600';
    const savingsBg = metrics.savings >= 0 ? 'bg-green-100' : 'bg-red-100';

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto border border-slate-200">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-semibold mb-6 hover:underline">
                <ArrowLeft size={18} />
                Back to All Shows
            </button>
            
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
                <h2 className="text-3xl font-bold text-slate-900">{show.destination}</h2>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <button onClick={() => { onBack(); onEdit(show); }} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                        <Edit size={20} className="text-slate-600" />
                    </button>
                    <button onClick={() => onDelete(show.id)} className="p-2 rounded-full hover:bg-red-100 transition-colors">
                        <Trash2 size={20} className="text-red-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {/* Metrics Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Financial Summary</h3>
                    <div className={`p-4 rounded-lg ${savingsBg}`}>
                        <p className="text-sm font-medium ${savingsColor}">Total Savings</p>
                        <p className={`text-4xl font-bold ${savingsColor}`}>${metrics.savings.toFixed(2)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-100">
                        <p className="text-sm font-medium text-blue-600">Salesman Commission</p>
                        <p className="text-3xl font-bold text-blue-600">${metrics.commission.toFixed(2)}</p>
                    </div>
                     <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
                        <span className="text-slate-600">Total Budget:</span>
                        <span className="font-bold text-slate-800">${metrics.totalBudget.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
                        <span className="text-slate-600">Actual Spend:</span>
                        <span className="font-bold text-slate-800">${metrics.actualSpend.toFixed(2)}</span>
                    </div>
                </div>
                {/* Details Section */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-slate-700 border-b pb-2">Cost Breakdown</h3>
                     <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
                        <span className="text-slate-600">Sleeping Rooms ({show.nights} nights):</span>
                        <span className="font-bold text-slate-800">${(show.actualRoomCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
                        <span className="text-slate-600">Meeting Spaces ({show.meetingDays} days):</span>
                        <span className="font-bold text-slate-800">${(show.actualMeetingCost || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-700 border-b pb-2 mb-3">Notes</h3>
                <div className="bg-slate-50 p-4 rounded-lg min-h-[120px] whitespace-pre-wrap text-slate-700">
                    {show.notes || <span className="text-slate-400">No notes provided.</span>}
                </div>
            </div>
        </div>
    );
};


const ShowFormModal = ({ show, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        destination: '',
        nights: '',
        meetingDays: '',
        actualRoomCost: '',
        actualMeetingCost: '',
        notes: ''
    });

    useEffect(() => {
        setFormData({
            destination: show?.destination || '',
            nights: show?.nights || '',
            meetingDays: show?.meetingDays || '',
            actualRoomCost: show?.actualRoomCost || '',
            actualMeetingCost: show?.actualMeetingCost || '',
            notes: show?.notes || ''
        });
    }, [show]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        const isNumericField = ['nights', 'meetingDays', 'actualRoomCost', 'actualMeetingCost'].includes(name);
        if (isNumericField && value && !/^\d*\.?\d*$/.test(value)) {
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const processedData = {
            destination: formData.destination,
            nights: Number(formData.nights) || 0,
            meetingDays: Number(formData.meetingDays) || 0,
            actualRoomCost: Number(formData.actualRoomCost) || 0,
            actualMeetingCost: Number(formData.actualMeetingCost) || 0,
            notes: formData.notes
        };
        onSave(processedData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">{show ? 'Edit Show' : 'Add New Show'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <InputField label="Destination / Show Name" name="destination" value={formData.destination} onChange={handleChange} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Nights for Sleeping Rooms" name="nights" type="number" value={formData.nights} onChange={handleChange} required />
                        <InputField label="Days for Meeting Space" name="meetingDays" type="number" value={formData.meetingDays} onChange={handleChange} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Actual Room Cost ($)" name="actualRoomCost" type="number" value={formData.actualRoomCost} onChange={handleChange} placeholder="e.g., 1500.50" required />
                        <InputField label="Actual Meeting Cost ($)" name="actualMeetingCost" type="number" value={formData.actualMeetingCost} onChange={handleChange} placeholder="e.g., 800" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="4"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add any relevant notes for this show..."
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            {show ? 'Save Changes' : 'Add Show'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputField = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            id={props.name}
            {...props}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

const EmptyState = ({ onAddShow }) => (
    <div className="text-center py-16 px-6 bg-white rounded-xl shadow-md border border-dashed">
        <FileText size={48} className="mx-auto text-slate-400" />
        <h3 className="mt-4 text-xl font-semibold text-slate-700">No Shows Yet</h3>
        <p className="mt-1 text-slate-500">Get started by adding your first roadshow.</p>
        <button
            onClick={onAddShow}
            className="mt-6 flex items-center gap-2 mx-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200"
        >
            <Plus size={20} />
            Add First Show
        </button>
    </div>
);

const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
);

const ErrorMessage = ({ message, onDismiss }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex justify-between items-center" role="alert">
        <div>
            <p className="font-bold">Error</p>
            <p>{message}</p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-full hover:bg-red-200">
            <X size={20} />
        </button>
    </div>
);
