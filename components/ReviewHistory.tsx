
import React from 'react';
import { ReviewHistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';

interface ReviewHistoryProps {
  history: ReviewHistoryItem[];
  onView: (item: ReviewHistoryItem) => void;
}

const ReviewHistory: React.FC<ReviewHistoryProps> = ({ history, onView }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <Card>
        <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-700 pb-4">Past Reviews</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {history.map(item => (
            <div key={item.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">REQ: {item.project.reqId} - {item.project.screen}</p>
                <p className="text-sm text-gray-400">
                  {new Date(item.timestamp).toLocaleString()} - {item.findings.length} finding{item.findings.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => onView(item)} variant="secondary" size="sm" className="flex-shrink-0">
                View Report
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ReviewHistory;
