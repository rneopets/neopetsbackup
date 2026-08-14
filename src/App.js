import React from 'react';
import {
  Box,
  VStack,
  Divider,
  useToast,
  Flex,
  Spacer,
  IconButton,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import { FaBars, FaQuestionCircle } from 'react-icons/fa';
import { ColorModeSwitcher } from './ColorModeSwitcher';
import * as zip from '@zip.js/zip.js';
import About from './components/About';
import EnterNeopetName from './components/EnterNeopetName';
import SavedPets from './components/SavedPets';
import HistorySidebar from './components/HistorySidebar';
import FAQ from './components/FAQ';
import { EMOTIONS, SIZES } from './utils/constants';
import Footer from './components/Footer';

const STORAGE_KEY = 'neopets-sci-history';

function App() {
  const [petName, setPetName] = React.useState('');
  const [alreadySavedPets, setAlreadySavedPets] = React.useState([]);
  const [canDownload, setCanDownload] = React.useState(false);
  const [sciHistory, setSciHistory] = React.useState({});
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, xl: false });
  const {
    isOpen: isFAQOpen,
    onOpen: onFAQOpen,
    onClose: onFAQClose,
  } = useDisclosure();

  // Load SCI history from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSciHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e);
    }
  }, []);

  // Save SCI history to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sciHistory));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }, [sciHistory]);

  const addPetToState = (petName, error) => {
    setAlreadySavedPets(existingArray => {
      const petIndex = existingArray.findIndex(
        pet => pet.petName.toLowerCase() === petName.toLowerCase()
      );
      const newPet = {
        error,
        petName,
        downloaded: 0,
        done: false,
        bytes: 0,
      };
      return [newPet, ...existingArray.filter((_, i) => i !== petIndex)];
    });
  };

  const updatePetInState = (petName, data) => {
    setAlreadySavedPets(existingArray => {
      const petIndex = Math.max(
        0,
        existingArray.findIndex(
          pet => pet.petName.toLowerCase() === petName.toLowerCase()
        )
      );
      const existingPet = existingArray[petIndex];
      const newPet = {
        // a neoPet, in a way
        ...existingPet,
        ...data,
      };
      return [
        ...existingArray.slice(0, petIndex),
        newPet,
        ...existingArray.slice(petIndex + 1),
      ];
    });
  };

  const incrementDownloadedForPet = petName => {
    setAlreadySavedPets(existingArray => {
      const petIndex = Math.max(
        0,
        existingArray.findIndex(
          pet => pet.petName.toLowerCase() === petName.toLowerCase()
        )
      );
      const existingPet = existingArray[petIndex];
      const newPet = {
        ...existingPet,
        downloaded: (existingPet?.downloaded ?? 0) + 1,
      };
      return [
        ...existingArray.slice(0, petIndex),
        newPet,
        ...existingArray.slice(petIndex + 1),
      ];
    });
  };

  const addSCIEntry = (petName, sci) => {
    const normalizedName = petName.toLowerCase();
    setSciHistory(prev => {
      const petEntries = prev[normalizedName] || [];
      // Check if this exact SCI already exists for this pet
      const exists = petEntries.some(entry => entry.sci === sci);
      if (exists) {
        return prev; // Don't add duplicate, but still return prev to trigger save
      }
      // Add new entry at the beginning (most recent first)
      const newEntry = { t: Date.now(), sci };
      return {
        ...prev,
        [normalizedName]: [newEntry, ...petEntries],
      };
    });
  };

  const deleteSCIEntry = (petName, index) => {
    const normalizedName = petName.toLowerCase();
    setSciHistory(prev => {
      const petEntries = prev[normalizedName] || [];
      const newEntries = petEntries.filter((_, i) => i !== index);
      if (newEntries.length === 0) {
        const { [normalizedName]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [normalizedName]: newEntries,
      };
    });
  };

  const deleteAllSCIEntries = (petName) => {
    const normalizedName = petName.toLowerCase();
    setSciHistory(prev => {
      const { [normalizedName]: removed, ...rest } = prev;
      return rest;
    });
  };

  const importSCIHistory = (importedData, overwrite = false) => {
    if (overwrite) {
      // Overwrite entire history with imported data
      setSciHistory(importedData);
    } else {
      // Merge imported data with existing, prioritizing imported data
      setSciHistory(prev => {
        const merged = { ...prev };
        Object.keys(importedData).forEach(petName => {
          const normalizedName = petName.toLowerCase();
          const importedEntries = importedData[petName] || [];
          const existingEntries = merged[normalizedName] || [];
          // Combine and deduplicate by SCI value, keeping oldest timestamp
          const entryMap = new Map();
          [...existingEntries, ...importedEntries].forEach(entry => {
            const existing = entryMap.get(entry.sci);
            if (!existing || entry.t < existing.t) {
              entryMap.set(entry.sci, entry);
            }
          });
          merged[normalizedName] = Array.from(entryMap.values()).sort(
            (a, b) => b.t - a.t
          );
        });
        return merged;
      });
    }
  };

  const processBatch = async (tasks, batchSize) => {
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      await Promise.all(batch);
    }
  };

  const makeZip = async (name, sci) => {
    let zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));

    let promises = []; // whee
    let error = undefined;

    try {
      for (const [emo_name, emo_value] of Object.entries(EMOTIONS)) {
        for (const [size_name, size_value] of Object.entries(SIZES)) {
          promises.push(
            fetch(
              `/api/pet-proxy/?sci=${sci}&emote=${emo_value}&size=${size_value}`
            ).then(async response => {
              const path = `${size_name}/${emo_name}.png`;
              const blob = await response.blob();
              await zipWriter.add(path, new zip.BlobReader(blob));
              incrementDownloadedForPet(name);
            })
          );
        }
      }
      await processBatch(promises, 9);
    } catch (e) {
      error = e;
      toast({
        id: name,
        status: 'error',
        title: `Error downloading ${name}'s images: ${e}`,
        isClosable: true,
      });
    }

    const dataURI = URL.createObjectURL(await zipWriter.close());

    const anchor = document.createElement('a');
    const clickEvent = new MouseEvent('click');
    anchor.href = dataURI;
    anchor.download = `${name}-${sci}.zip`;
    anchor.dispatchEvent(clickEvent);
    URL.revokeObjectURL(dataURI);

    updatePetInState(petName, {
      error,
      done: true,
      bytes: zipWriter?.writer?.size || 0,
    });

    // Add SCI entry if download was successful
    if (!error) {
      addSCIEntry(name, sci);
    }
  };

  const redownloadPet = async (petName, sci) => {
    try {
      addPetToState(petName, false);
      await makeZip(petName, sci);
    } catch (error) {
      toast({
        id: 'redownloadPet',
        status: 'error',
        title: `Error redownloading ${petName}'s images`,
        isClosable: true,
      });
      updatePetInState(petName, { error: true });
    }
  };

  const getCurrentSci = async petName => {
    try {
      const response = await fetch(`/api/pet-proxy/?name=${petName}`, {
        method: 'HEAD',
      });
      return response.headers.get('sci');
    } catch (error) {
      console.error(`Error fetching current SCI for ${petName}:`, error);
      return null;
    }
  };

  const saveSnapshot = async petName => {
    if (petName === '') {
      return;
    }
    try {
      addPetToState(petName, false);
      updatePetInState(petName, { saving: true });
      const sci = await getCurrentSci(petName);
      if (sci) {
        addSCIEntry(petName, sci);
        updatePetInState(petName, { saving: false, done: true });
        setPetName('');
        toast({
          status: 'success',
          title: `Snapshot saved for ${petName}`,
          duration: 2000,
          isClosable: true,
        });
      } else {
        updatePetInState(petName, { saving: false, error: true });
        toast({
          status: 'error',
          title: `Error saving snapshot - make sure you spelled ${petName}'s name correctly.`,
          isClosable: true,
        });
      }
    } catch (error) {
      updatePetInState(petName, { saving: false, error: true });
      toast({
        id: 'saveSnapshot',
        status: 'error',
        title: `Error saving snapshot - make sure you spelled ${petName}'s name correctly.`,
        isClosable: true,
      });
    }
  };

  const getSci = async petName => {
    if (petName === '' || !canDownload) {
      return;
    }
    try {
      addPetToState(petName, false);
      setPetName('');
      const sci = await getCurrentSci(petName);
      if (sci) {
        await makeZip(petName, sci);
      } else {
        throw new Error('Failed to get SCI');
      }
    } catch (error) {
      toast({
        id: 'getSci',
        status: 'error',
        title: `Error downloading ${petName}'s images - make sure you spelled their name correctly.`,
        isClosable: true,
      });
      updatePetInState(petName, { error: true });
    }
  };

  const handlePetNameChange = event => {
    let name = event.target.value;
    name = name.trim();
    setPetName(name);
    setCanDownload(false);
  };

  return (
    <Flex direction="row" minHeight="100vh">
      <HistorySidebar
        sciHistory={sciHistory}
        onDeleteEntry={deleteSCIEntry}
        onDeleteAllEntries={deleteAllSCIEntries}
        onImport={importSCIHistory}
        onRedownload={redownloadPet}
        onDownloadCurrent={async petName => {
          const sci = await getCurrentSci(petName);
          if (sci) {
            await redownloadPet(petName, sci);
          }
        }}
        onSaveCurrent={saveSnapshot}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      <Flex direction="column" flex={1} ml={{ base: 0, xl: '300px' }}>
        <Box textAlign="center" fontSize="xl" width="100%">
          <Flex
            direction="column"
            p={{ base: 2, lg: 3 }}
            minHeight={'calc(100vh-100px)'}
            align="center"
          >
            <Flex justify="space-between" width="100%" mb={4} maxW="6xl">
              {isMobile ? (
                <IconButton
                  icon={<FaBars />}
                  aria-label="Open history"
                  onClick={() => setIsHistoryOpen(true)}
                  variant="ghost"
                />
              ) : (
                <Box />
              )}
              <Flex gap={2}>
                <IconButton
                  icon={<FaQuestionCircle />}
                  aria-label="FAQ"
                  onClick={onFAQOpen}
                  variant="ghost"
                />
                <ColorModeSwitcher />
              </Flex>
            </Flex>
            <VStack
              spacing={8}
              divider={<Divider maxW={{ base: '100%', lg: '3xl' }} />}
              width="100%"
              maxW="6xl"
              align="center"
              px={{ base: 2, lg: 0 }}
            >
              <About />

              <EnterNeopetName
                petName={petName}
                canDownload={canDownload}
                setCanDownload={setCanDownload}
                handlePetNameChange={handlePetNameChange}
                getSci={getSci}
                saveSnapshot={saveSnapshot}
              />

              <SavedPets alreadySavedPets={alreadySavedPets} />
            </VStack>
          </Flex>
        </Box>
        <Spacer />
        <Footer />
      </Flex>

      <FAQ isOpen={isFAQOpen} onClose={onFAQClose} />
    </Flex>
  );
}

export default App;
