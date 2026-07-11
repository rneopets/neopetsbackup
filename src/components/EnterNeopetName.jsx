import React from 'react';
import {
  Input,
  Image,
  Button,
  HStack,
  useColorModeValue,
  Skeleton,
} from '@chakra-ui/react';

const EnterNeopetName = props => {
  // The skeleton/image of the pet + the input field for pet name + the download button
  const {
    petName,
    canDownload,
    setCanDownload,
    handlePetNameChange,
    getSci,
    saveSnapshot,
  } = props;

  const green = useColorModeValue('green.300', 'green.500');
  const blue = useColorModeValue('blue.300', 'blue.500');

  return (
    <HStack
      spacing={3}
      justify="center"
      flexWrap={{ base: 'wrap', sm: 'nowrap' }}
    >
      <Image
        src={`http://pets.neopets.com/cpn/${petName}/1/6.png`}
        title={petName}
        fallback={
          <Skeleton w="70px" h="70px" borderRadius="xl" flexShrink={0} />
        }
        borderRadius="xl"
        w="70px"
        h="70px"
        flexShrink={0}
        onLoad={() => setCanDownload(true)}
      />
      <Input
        width={{ base: '140px', sm: '200px', md: '400px', lg: '500px' }}
        borderColor={green}
        value={petName}
        onChange={handlePetNameChange}
        placeholder="Enter a Neopet's name"
        onKeyPress={e => e.key === 'Enter' && saveSnapshot(petName)}
      />
      <Button
        disabled={!petName || !canDownload}
        onClick={() => saveSnapshot(petName)}
        bgColor={blue}
        flexShrink={0}
      >
        Save
      </Button>
      <Button
        disabled={!petName || !canDownload}
        onClick={() => getSci(petName)}
        bgColor={green}
        flexShrink={0}
      >
        Download
      </Button>
    </HStack>
  );
};

export default EnterNeopetName;
