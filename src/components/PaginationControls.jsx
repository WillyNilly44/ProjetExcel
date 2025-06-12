import React from 'react';

export default function PaginationControls({ currentPage, setCurrentPage, totalItems, pageSize }) {
  const totalPages = Math.ceil(totalItems / pageSize);

  const prev = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const next = () => {
    if ((currentPage + 1) * pageSize < totalItems) setCurrentPage(currentPage + 1);
  };

  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <button onClick={prev} disabled={currentPage === 0}>⬅ Previous</button>
      <span style={{ margin: '0 15px', fontWeight: 'bold' }}>
        Page {currentPage + 1} of {totalPages}
      </span>
      <button onClick={next} disabled={(currentPage + 1) * pageSize >= totalItems}>Next ➡</button>
    </div>
  );
}
