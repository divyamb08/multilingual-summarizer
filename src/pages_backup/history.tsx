import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSummaryHistory, deleteSummaryFromHistory, SummaryHistoryItem } from '../utils/localStorage';

export default function HistoryPage() {
  // State for summary history items
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  // State for the selected summary item for detailed view
  const [selectedItem, setSelectedItem] = useState<SummaryHistoryItem | null>(null);
  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');

  // Load history on mount
  useEffect(() => {
    const summaryHistory = getSummaryHistory();
    setHistory(summaryHistory);
  }, []);

  // Format date string
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format content preview (truncate if too long)
  const formatPreview = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle delete summary
  const handleDelete = (id: string) => {
    const wasDeleted = deleteSummaryFromHistory(id);
    if (wasDeleted) {
      // Update state to remove the deleted item
      setHistory(prev => prev.filter(item => item.id !== id));
      
      // Clear selected item if it was deleted
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
      
      // Show confirmation message
      setDeleteConfirmation('Summary deleted successfully');
      setTimeout(() => setDeleteConfirmation(''), 3000);
    }
  };

  // Handle view summary details
  const handleViewDetails = (item: SummaryHistoryItem) => {
    setSelectedItem(item);
  };

  // Handle close detail view
  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen p-6">
      <Head>
        <title>History - Multilingual Summarizer</title>
        <meta name="description" content="View your summary history" />
      </Head>

      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Summary History</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Home
          </Link>
        </div>
      </header>

      <main>
        {/* Delete confirmation toast */}
        {deleteConfirmation && (
          <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50">
            {deleteConfirmation}
          </div>
        )}

        {/* Summary Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Summary Details</h2>
                  <button 
                    onClick={handleCloseDetails}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 text-sm text-gray-500">
                  <p>Created: {formatDate(selectedItem.date)}</p>
                  <p>Source Language: {selectedItem.sourceLanguage}</p>
                  <p>Target Language: {selectedItem.targetLanguage}</p>
                  <p>Summary Length: {selectedItem.summaryLength}</p>
                  {selectedItem.sourceType && <p>Source Type: {selectedItem.sourceType}</p>}
                  {selectedItem.fileName && <p>File Name: {selectedItem.fileName}</p>}
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Original Content Preview:</h3>
                  <div className="bg-gray-100 p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{selectedItem.contentPreview}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Summary:</h3>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{selectedItem.summary}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md"
                  >
                    Delete This Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No summary history found. Create summaries to see them here.</p>
              <Link href="/" className="mt-4 inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md">
                Create a Summary
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Languages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="block">{item.sourceLanguage} → {item.targetLanguage}</span>
                      <span className="text-xs">{item.summaryLength} summary</span>
                      {item.sourceType && <span className="block text-xs">Type: {item.sourceType}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {formatPreview(item.contentPreview)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
