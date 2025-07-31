/* The AddColumnModal is trying to POST to '/api/add-column' */
/* Make sure this endpoint exists in your backend */

const response = await fetch('/api/add-column', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    columnData,
    user: {
      id: user?.id,
      email: user?.email,
      name: user?.name
    }
  })
});