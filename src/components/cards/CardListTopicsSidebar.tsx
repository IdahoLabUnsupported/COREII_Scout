// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useRef } from 'react';
import { Draggable, DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import DialogAddEmergingTopic from '../dialogs/DialogAddEmergingTopic'; // Updated import
import { CardItem } from '../../../app/types/types';
import FormElementCheckbox from '../forms/formElements/FormElementCheckbox';
import DialogAddRssSource from '../dialogs/DialogAddRssSource';

interface CardListTopicsSidebarProps {
  items: CardItem[];
  onToggleIsMarked: (id: string) => void;
  onEdit: (id: string) => void;
  onHide: (id: string) => void;
  onUnhide: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (result: DropResult) => void;
  checkedItems?: { [key: string]: boolean }; // Made optional
  onCheckboxChange?: (id: string) => void; // Made optional
  onSelect?: (item: CardItem) => void; // Added onSelect prop
  selectedItemId?: string; // Added selectedItemId prop
}

const CardListTopicsSidebar: React.FC<CardListTopicsSidebarProps> = ({
  items,
  onEdit,
  onHide,
  onUnhide,
  onDelete,
  onToggleIsMarked,
  onDragEnd,
  checkedItems, // Receive checkedItems as a prop
  onCheckboxChange, // Receive checkbox change handler as a prop
  onSelect, // Receive onSelect as a prop
  selectedItemId // Receive selectedItemId as a prop
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CardItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formType, setFormType] = useState<'topic' | 'article'>('topic'); // State to manage form type
  const dialogRef = useRef<any>(null);
 
  const toggleDropdown = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  const handleEditClick = (item: CardItem) => {
    setSelectedItem(item);
    setFormType(item.url ? 'article' : 'topic'); // Determine form type based on item properties
    setShowDialog(true); // Open the dialog
    toggleDropdown(item.id);
  };

  const handleDialogClose = () => {
    setShowDialog(false); // Close the dialog
  };

  const handleItemClick = (item: CardItem) => {
    if (onSelect) {
      onSelect(item);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item: CardItem, index: number) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${item.hidden ? 'bg-gray-700' : item.id === selectedItemId ? 'bg-primary' : 'bg-gray-600'} shadow-md p-6 flex items-center justify-between h-12 rounded`}
                      onClick={() => handleItemClick(item)} // Invoke onSelect when item is clicked
                    >
                      <span className="truncate w-3/4">{item.title}</span> {/* Added classes for truncation */}
                      <div className="relative flex flex-row">
                        {item.isMarked !== undefined && (
                          <button
                            className="text-gray-300 hover:text-gray-500 flex flex-row content-center"
                            onClick={() => onToggleIsMarked(item.id)}
                          >
                            <span className={`material-icons ${item.isMarked ? 'text-yellow-500' : ''}`}>
                              {item.isMarked ? "star" : "star_border"}
                            </span>
                          </button>
                        )}
                        {item.url && item.url.trim() !== '' && ( // Check if url is not empty
                          <>
                            <button
                              className="text-gray-300 hover:text-gray-500 flex flex-row content-center mt-1 mr-2"
                              onClick={() => window.open(item.url, '_blank')} // Open the URL in a new tab
                            >
                              <span className="material-icons">launch</span>
                            </button>
                            <DialogAddRssSource
                                title="Add Source"
                                buttonType="icon"
                                buttonIcon="add"
                                buttonColor="btn-primary"
                                buttonSize="btn-sm"
                                buttonLabel="Add Source"
                                articleData={item}
                              />
                          </>
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
        <DialogAddEmergingTopic
          title={formType === 'topic' ? "Add Topic" : "Add Article"} // Different titles for each form
          buttonType="text"
          buttonColor="btn-primary"
          item={selectedItem}
          showDialog={showDialog}
          onClose={handleDialogClose}
          formType={formType} // Pass the formType prop to the dialog
        />
      )}
    </>
  );
};

export default CardListTopicsSidebar;