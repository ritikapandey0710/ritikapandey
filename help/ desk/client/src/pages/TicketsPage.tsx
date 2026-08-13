{header.getIsPlaceholder() ? null : (
                    <div className="flex items-center gap-1">
                      {/* Render header based on column ID */}
                      {header.column.id === 'id' ? '#' :
                       header.column.id === 'subject' ? 'Subject' :
                       header.column.id === 'senderName' ? 'Sender' :
                       header.column.id === 'status' ? 'Status' :
                       header.column.id === 'category' ? 'Category' :
                       header.column.id === 'assignedTo' ? 'Assigned To' :
                       header.column.id === 'createdAt' ? 'Created' :
                       header.column.id === 'actions' ? 'Actions' :
                       header.column.id}
                      {header.getIsSorted() === 'asc' ? ' �� 🔼' : header.getIsSorted() === 'desc' ? ' �� 🔽' : null}
                    </div>
                  )}