import React, { forwardRef, useState } from 'react';
import { RootState } from '../../../app/store/index.ts';
import { createSelector } from '@reduxjs/toolkit';
import CardStatusNested from '../../components/cards/CardStatusNested';
import CardContent from '../../components/cards/CardContent';
import CardListTopicsSidebar from '../../components/cards/CardListTopicsSidebar';
import { DropResult } from '@hello-pangea/dnd';
import { CardItem } from '../../../app/types/types';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  data?: any;
};

export interface FormArticleTopicExplorerHandles {
  //deleteSource: () => void;
}
const initialTopics = [
  { id: '1', title: 'Ransomware Attacks', hidden: false, isMarked: true, description: 'Understanding and mitigating ransomware threats', tags: 'ransomware, attacks, security', url: '' },
  { id: '2', title: 'Phishing Scams', hidden: false, isMarked: false, description: 'Detecting and preventing phishing attempts', tags: 'phishing, scams, security', url: '' },
  { id: '3', title: 'Zero-Day Vulnerabilities', hidden: false, isMarked: false, description: 'Identifying and addressing zero-day exploits', tags: 'zero-day, vulnerabilities, security', url: '' },
  { id: '4', title: 'Cyber Threat Intelligence', hidden: false, isMarked: false, description: 'Gathering and utilizing cyber threat intelligence', tags: 'cyber, threat, intelligence', url: '' },
  { id: '5', title: 'Data Breaches', hidden: false, isMarked: false, description: 'Understanding and responding to data breaches', tags: 'data, breaches, security', url: '' },
  { id: '6', title: 'Malware Analysis', hidden: false, isMarked: false, description: 'Analyzing and mitigating malware threats', tags: 'malware, analysis, security', url: '' },
  { id: '7', title: 'Network Security', hidden: false, isMarked: false, description: 'Implementing and maintaining network security', tags: 'network, security, defense', url: '' },
  { id: '8', title: 'Cloud Security', hidden: false, isMarked: false, description: 'Securing data and applications in the cloud', tags: 'cloud, security, data', url: '' },
  { id: '9', title: 'IoT Security', hidden: false, isMarked: false, description: 'Protecting Internet of Things devices', tags: 'IoT, security, devices', url: '' },
  { id: '10', title: 'Cybersecurity Best Practices', hidden: false, isMarked: false, description: 'Implementing best practices for cybersecurity', tags: 'cybersecurity, best practices, security', url: '' },
  { id: '11', title: 'Mobile Security', hidden: false, isMarked: false, description: 'Securing mobile devices and applications', tags: 'mobile, security, devices', url: '' },
  { id: '12', title: 'Security Incident Response', hidden: false, isMarked: false, description: 'Responding to security incidents effectively', tags: 'security, incident, response', url: '' },
  { id: '13', title: 'Cyber Risk Management', hidden: false, isMarked: false, description: 'Managing and mitigating cyber risks', tags: 'cyber, risk, management', url: '' },
  { id: '14', title: 'Encryption Technologies', hidden: false, isMarked: false, description: 'Utilizing encryption to protect data', tags: 'encryption, technologies, data', url: '' },
];

const initialArticles = [
  { id: '1', title: 'Ransomware Attacks: How to Protect Your Data from Encryption Extortion', hidden: false, description: 'A comprehensive guide to defending against ransomware', tags: 'ransomware, protection, data', url: 'https://www.google.com' },
  { id: '2', title: 'Phishing Scams: Identifying and Avoiding Cyber Traps', hidden: false, description: 'Techniques to recognize and steer clear of phishing attempts', tags: 'phishing, scams, identification', url: 'https://www.google.com' },
  { id: '3', title: 'Zero-Day Vulnerabilities: The Hidden Threats Lurking in Your Software', hidden: false, description: 'Understanding and mitigating zero-day exploits', tags: 'zero-day, vulnerabilities, threats', url: 'https://www.google.com' },
  { id: '4', title: 'Cyber Threat Intelligence: Staying One Step Ahead of Hackers', hidden: false, description: 'Leveraging threat intelligence to preempt cyber attacks', tags: 'cyber, threat, intelligence', url: 'https://www.google.com' },
  { id: '5', title: 'Surviving Data Breaches: Lessons from the Biggest Hacks of the Decade', hidden: false, description: 'Learning from major data breaches to improve security', tags: 'data, breaches, lessons', url: 'https://www.google.com' },
  { id: '6', title: 'Malware Analysis: Dissecting the Latest Cyber Threats', hidden: false, description: 'Analyzing current malware to mitigate risks', tags: 'malware, analysis, threats', url: 'https://www.google.com' },
  { id: '7', title: 'Network Security: Building a Robust Defense Against Cyber Intrusions', hidden: false, description: 'Strategies for strengthening network security', tags: 'network, security, defense', url: 'https://www.google.com' },
  { id: '8', title: 'Cloud Security: Safeguarding Your Data in the Digital Sky', hidden: false, description: 'Best practices for securing cloud-stored data', tags: 'cloud, security, data', url: 'https://www.google.com' },
  { id: '9', title: 'IoT Security: Protecting the Connected Devices in Your Home', hidden: false, description: 'Ensuring the security of IoT devices in your environment', tags: 'IoT, security, devices', url: 'https://www.google.com' },
  { id: '10', title: 'Cybersecurity Best Practices: Tips for Keeping Your Data Safe', hidden: false, description: 'Effective practices for maintaining cybersecurity', tags: 'cybersecurity, best practices, safety', url: 'https://www.google.com' },
  { id: '11', title: 'Mobile Security: Defending Your Smartphone from Cyber Attacks', hidden: false, description: 'Protecting mobile devices from cyber threats', tags: 'mobile, security, smartphone', url: 'https://www.google.com' },
  { id: '12', title: 'Security Incident Response: What to Do When Your Network is Compromised', hidden: false, description: 'Steps to take following a security breach', tags: 'security, incident, response', url: 'https://www.google.com' },
  { id: '13', title: 'Cyber Risk Management: Mitigating Threats in the Digital Age', hidden: false, description: 'Managing cyber risks effectively', tags: 'cyber, risk, mitigation', url: 'https://www.google.com' },
  { id: '14', title: 'Encryption Technologies: How to Shield Your Data from Prying Eyes', hidden: false, description: 'Using encryption to protect sensitive information', tags: 'encryption, technologies, data', url: 'https://www.google.com' },
  { id: '15', title: 'Identity and Access Management: Ensuring Only the Right People Have Access', hidden: false, description: 'Controlling access to systems and data', tags: 'identity, access, management', url: 'https://www.google.com' }
];
const FormArticleTopicExplorer = forwardRef<FormArticleTopicExplorerHandles, Props>(({ onClose, showFormButtons = true, data }, ref) => {

 
  const selectDerivedReportId = (state: RootState) => state.reportId.reportId;

  const selectResultData = createSelector(
    [selectDerivedReportId],
    (currentDerivedReportId) => ({
      currentDerivedReportId
     
    })
  );

  const [itemsTopics, setItemsTopics] = useState<CardItem[]>(initialTopics);
  const [itemsArticles, setItemsArticles] = useState<CardItem[]>(initialArticles);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({}); // State to manage checkbox values
  const [selectedTopic, setSelectedTopic] = useState<CardItem>(initialTopics[0]); // State for selected topic
  
    const handleToggleIsMarked = (setItems: React.Dispatch<React.SetStateAction<CardItem[]>>, items: CardItem[], id: string) => {
      setItems(items.map(item => item.id === id ? { ...item, isMarked: !item.isMarked } : item));
    };
  
    const handleEdit = (id: string) => {
    };
  
    const handleHide = (setItems: React.Dispatch<React.SetStateAction<CardItem[]>>, items: CardItem[], id: string) => {
      setItems(items.map(item => item.id === id ? { ...item, hidden: true } : item));
    };
  
    const handleUnhide = (setItems: React.Dispatch<React.SetStateAction<CardItem[]>>, items: CardItem[], id: string) => {
      setItems(items.map(item => item.id === id ? { ...item, hidden: false } : item));
    };
  
    const handleDelete = (setItems: React.Dispatch<React.SetStateAction<CardItem[]>>, items: CardItem[], id: string) => {
      setItems(items.filter((item) => item.id !== id));
    };
  
    const handleDragEnd = (setItems: React.Dispatch<React.SetStateAction<CardItem[]>>, items: CardItem[], result: DropResult) => {
      if (!result.destination) {
        return;
      }
  
      const reorderedItems = Array.from(items);
     const [movedItem] = reorderedItems.splice(result.source.index, 1);
      reorderedItems.splice(result.destination.index, 0, movedItem);
  
      setItems(reorderedItems);
    };
  
    const handleSelectAllChange = () => {
      const newCheckedState = !selectAllChecked;
      setSelectAllChecked(newCheckedState);
      
      const newCheckedItems: { [key: string]: boolean } = {};
      
      // Update checked items based on the select all state
      itemsTopics.forEach(item => {
        newCheckedItems[item.id] = newCheckedState; // Set all checkboxes based on the select all checkbox
      });
  
      setCheckedItems(newCheckedItems); // Use setCheckedItems to update the state
    };
  
    const handleCheckboxChange = (id: string) => {
      setCheckedItems((prev) => ({
        ...prev,
        [id]: !prev[id], // Toggle the checked state for the specific item
      }));
    };
  
    const handleTopicSelect = (topic: CardItem) => {
      setSelectedTopic(topic);
    };
  

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <CardStatusNested title={'Topics'} type="normal" >
          <CardContent customPadding="p-0" customClass={'mt-1'}>
            <CardListTopicsSidebar
              items={itemsTopics}
              onEdit={handleEdit}
              onHide={(id: string) => handleHide(setItemsTopics, itemsTopics, id)}
              onUnhide={(id: string) => handleUnhide(setItemsTopics, itemsTopics, id)}
              onDelete={(id: string) => handleDelete(setItemsTopics, itemsTopics, id)}
              onToggleIsMarked={(id: string) => handleToggleIsMarked(setItemsTopics, itemsTopics, id)}
              onDragEnd={(result: DropResult) => handleDragEnd(setItemsTopics, itemsTopics, result)}
              onSelect={handleTopicSelect} // Pass the topic select handler
              selectedItemId={selectedTopic.id} // Pass the selected topic ID
            />
          </CardContent>
        </CardStatusNested>
      </div>
      <div>
        <CardStatusNested title={
          <div className="flex items-center">
              Related Articles:
              <span className="bg-gray-700 text-white text-sm font-semibold mr-2 px-3 py-1.5 rounded-full ml-2">
                {selectedTopic.title}
              </span>
              
            </div>
          } 
          type="normal" className="flex">
          <div className="mb-4 mr-4 flex absolute right-1 top-3">
            {/* <FormElementCheckbox
              className={'mt-1 ml-1'}
              labelClassName={'ml-2'}
              label={'Add All'}
              value={''}
              name={'selectAll'}
              checked={selectAllChecked} // Use the selectAllChecked state
              onChange={handleSelectAllChange} // Call the function to toggle all checkboxes
            /> */}
          </div>
          <CardContent customPadding="p-0">
            <CardListTopicsSidebar
              items={itemsArticles}
              onEdit={handleEdit}
              onHide={(id: string) => handleHide(setItemsArticles, itemsArticles, id)}
              onUnhide={(id: string) => handleUnhide(setItemsArticles, itemsArticles, id)}
              onDelete={(id: string) => handleDelete(setItemsArticles, itemsArticles, id)}
              onToggleIsMarked={(id: string) => handleToggleIsMarked(setItemsArticles, itemsArticles, id)}
              onDragEnd={(result: DropResult) => handleDragEnd(setItemsArticles, itemsArticles, result)}
              checkedItems={checkedItems} // Pass checked items
              onCheckboxChange={handleCheckboxChange} // Pass the checkbox change handler
            />
          </CardContent>
        </CardStatusNested>
      </div>
    </div>
  );
});

export default FormArticleTopicExplorer;
