// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useRef } from 'react';
import { Draggable, DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import DialogEditRssFeed, { CardListProps } from '../../components/dialogs/DialogEditRssFeed'; // Update the import path
import { CardItem } from '../../../app/types/types'; // Update the import path
import { FormEditRssFeedHandles } from '../forms/FormEditRssFeed';

const CardList: React.FC<CardListProps> = ({ items, onEdit, onHide, onUnhide, onDelete, onDragEnd }) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CardItem | null>(null);
  const [showDialog, setShowDialog] = useState(false); // State to control dialog visibility
  const dialogRef = useRef<FormEditRssFeedHandles>(null);

  const toggleDropdown = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  const handleEditClick = (item: CardItem) => {
    setSelectedItem(item);
    setShowDialog(true); // Open the dialog
    toggleDropdown(item.id); 
  };

  const handleDialogClose = () => {
    setShowDialog(false); // Close the dialog
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${item.hidden ? 'bg-gray-700' : 'bg-gray-600'} shadow-md p-6 flex items-center justify-between h-12 rounded`}
                    >
                      <span>{item.title}</span>
                      <div className="relative">
                        <button
                          className="text-gray-300 hover:text-gray-500 flex flex-row content-center"
                          onClick={() => toggleDropdown(item.id)}
                        >
                          <span className="material-icons">more_vert</span>
                        </button>
                        {dropdownOpen === item.id && (
                          <div className="absolute top-0 right-full mr-2 w-48 bg-gray-900 rounded shadow-lg z-50">
                            <ul>
                              <li>
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                                  onClick={() => handleEditClick(item)}
                                >
                                  Edit
                                </button>
                              </li>
                               <li>
                              {item.hidden ? (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                                  onClick={() => { onUnhide(item.id); setDropdownOpen(null); }}
                                >
                                  Unhide
                                </button>
                              ) : (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                                  onClick={() => { onHide(item.id); setDropdownOpen(null); }}
                                >
                                  Hide
                                </button>
                              )}
                                </li>
                                <li>
                                <button
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                                    onClick={() => { onDelete(item.id); setDropdownOpen(null); }}
                                >
                                    Delete
                                </button>
                                </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {showDialog && (
        <DialogEditRssFeed
          title="Edit RSS Feed"
          buttonType="text"
          buttonColor="btn-primary"
          item={selectedItem}
          showDialog={showDialog}
          onClose={handleDialogClose}
          onSave={() => {
            // Handle save logic here if needed
            handleDialogClose(); // Close the dialog after saving
          }}
        />
      )}
    </>
  );
};

export default CardList;