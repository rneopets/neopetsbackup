import React from 'react';
import {
  Box,
  VStack,
  Image,
  HStack,
  Progress,
  Skeleton,
  Badge,
  Icon,
  Flex,
  Text,
  LinkOverlay,
  LinkBox,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaFileArchive } from 'react-icons/fa';
import { EMOTIONS, SIZES } from '../utils/constants';

const SavedPets = props => {
  // one instance of the container of a pet that is either downloaded, to be downloaded, or errored.
  const { alreadySavedPets } = props;

  const errorStartColor = useColorModeValue('red.100', 'red.800');
  const errorEndColor = useColorModeValue('red.400', 'red.600');

  return (
    <Flex wrap="wrap" gap={3} width="100%" maxW={{ base: '100%', md: 'xl' }}>
      {alreadySavedPets.map(
        ({ error, petName, downloaded, done, bytes, saving }) => (
          <LinkBox
            key={petName}
            title={petName}
            flex={{
              base: '1 1 100%',
              sm: '1 1 calc(50% - 12px)',
              md: '1 1 calc(33.333% - 16px)',
            }}
            minW={{ base: '100%', sm: '250px' }}
          >
            <Box
              as={HStack}
              borderWidth="1px"
              borderRadius="lg"
              p={3}
              spacing={3}
            >
              <Image
                src={`https://pets.neopets.com/cpn/${petName}/1/6.png`}
                fallback={
                  <Skeleton
                    boxSize="70px"
                    borderRadius="xl"
                    startColor={error ? errorStartColor : null}
                    endColor={error ? errorEndColor : null}
                  />
                }
                borderRadius="xl"
                boxSize="70px"
                flexShrink={0}
              />
              <VStack
                alignItems={'start'}
                flex={1}
                spacing={1}
                minWidth={0}
                align="stretch"
              >
                <Box
                  textColor={error ? 'red.300' : null}
                  width="100%"
                  minWidth={0}
                  textAlign="left"
                >
                  <LinkOverlay
                    href={`http://www.neopets.com/petlookup.phtml?pet=${petName}`}
                    isExternal
                  >
                    <Text isTruncated textAlign="left">
                      {petName}
                    </Text>
                  </LinkOverlay>
                </Box>
                {error ? (
                  <Badge colorScheme="red">ERROR</Badge>
                ) : saving ? (
                  <HStack spacing={2}>
                    <Spinner size="sm" />
                    <Text fontSize="sm">Saving snapshot...</Text>
                  </HStack>
                ) : (
                  <>
                    {done ? (
                      <HStack spacing={2}>
                        {bytes > 0 ? (
                          <Badge colorScheme="blue">
                            <Icon boxSize="14px" as={FaFileArchive} mr={1} />
                            {(bytes / (1024 * 1024)).toFixed(2)}MB
                          </Badge>
                        ) : (
                          <Badge colorScheme="green">Saved</Badge>
                        )}
                      </HStack>
                    ) : (
                      <Progress
                        hasStripe
                        isAnimated
                        value={
                          100 *
                          (downloaded /
                            (Object.keys(EMOTIONS).length *
                              Object.keys(SIZES).length))
                        }
                        width="130px"
                        colorScheme={'blue'}
                      />
                    )}
                  </>
                )}
              </VStack>
            </Box>
          </LinkBox>
        )
      )}
    </Flex>
  );
};

export default SavedPets;
