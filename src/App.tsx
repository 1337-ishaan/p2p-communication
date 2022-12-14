import React, { useState, useEffect, useMemo, useCallback } from "react";
import logo from "./logo.svg";
import "./App.css";
import "./assets/css/style.css";

import {
  evmFactories,
  ethereumWalletFactory,
  EVMNetwork,
  EVM_NAMES,
} from "@ylide/ethereum";
import {
  AbstractBlockchainController,
  AbstractWalletController,
  BrowserLocalStorage,
  MessageContentV3,
  MessagesList,
  PublicKey,
  WalletControllerFactory,
  Ylide,
  YlideKeyPair,
  YlideKeyStore,
} from "@ylide/sdk";
import {
  everscaleBlockchainFactory,
  everscaleWalletFactory,
  uint256ToAddress,
} from "@ylide/everscale";
import {
  Accordion,
  Alert,
  Button,
  Card,
  CardGroup,
  Col,
  Form,
  Modal,
  Row,
} from "react-bootstrap";
import { PLATFORM_ADDRESS } from "./constants";
import { create, CID, IPFSHTTPClient } from "ipfs-http-client";
import { Buffer } from "buffer";

import { Navbar, Container, Nav, Dropdown } from "react-bootstrap";
import CardHeader from "react-bootstrap/esm/CardHeader";
import { IntroPage } from "./components/IntroPage";
// import IpfsUploader from "./components/IpfsUploader";

var ipfs: IPFSHTTPClient | undefined;

const auth =
  "Basic " +
  Buffer.from(
    "2IBk8BDSROy6GQUjjPZi4wT2xe5" + ":" + "d77303e5c8349747b2cadf20d0f2f71e"
  ).toString("base64");
// "<infura-project-id>" + ":" + "<infura-secret-key>"

try {
  ipfs = create({
    url: "https://ipfs.infura.io:5001",
    headers: {
      authorization: auth,
    },
  });
} catch (error) {
  console.error("IPFS error ", error);
  ipfs = undefined;
}

// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.POLYGON]);
// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.ETHEREUM]);
// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.BNBCHAIN]);
// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.POLYGON]);
Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.ARBITRUM]);
// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.OPTIMISM]);
// Ylide.registerBlockchainFactory(evmFactories[EVMNetwork.AVALANCHE]);
Ylide.registerWalletFactory(ethereumWalletFactory);
// Ylide.registerWalletFactory(everscaleWalletFactory);

function App() {
  document.title =
    "P2P File Communication  - Send Private Secure Messages and files cross chain";

  /*
  [START] STATE VARIABLES FOR STORING ACCOUNTS, WALLETS AND ALL ASSOICATED DATA
   */
  const storage = useMemo(() => new BrowserLocalStorage(), []);
  const keystore = useMemo(
    () =>
      new YlideKeyStore(storage, {
        onPasswordRequest: async () => null,
        onDeriveRequest: async () => null,
      }),
    [storage]
  );
  const [ylide, setYlide] = useState<Ylide | null>(null);
  const [walletsList, setWalletsList] = useState<
    { factory: WalletControllerFactory; isAvailable: boolean }[]
  >([]);
  const [accounts, setAccounts] = useState<
    { wallet: string; address: string }[]
  >(
    localStorage.getItem("accs")
      ? JSON.parse(localStorage.getItem("accs")!)
      : []
  );
  const [currAcc, setCurrAcc] = useState<{ wallet: string; address: string }>();
  const [currAccState, setCurrAccState] = useState<
    Record<
      string,
      {
        localKey: YlideKeyPair | null;
        remoteKey: Uint8Array | null;
        wallet: {
          wallet: AbstractWalletController;
          factory: WalletControllerFactory;
        } | null;
      }
    >
  >({});
  const [accountsState, setAccountsState] = useState<
    Record<
      string,
      {
        localKey: YlideKeyPair | null;
        remoteKey: Uint8Array | null;
        wallet: {
          wallet: AbstractWalletController;
          factory: WalletControllerFactory;
        } | null;
      }
    >
  >({});
  const [wallets, setWallets] = useState<
    { wallet: AbstractWalletController; factory: WalletControllerFactory }[]
  >([]);
  const [readers, setReaders] = useState<AbstractBlockchainController[]>([]);
  const [keys, setKeys] = useState<YlideKeyStore["keys"]>([]);
  /*
  [END] STATE VARIABLES FOR STORING ACCOUNTS, WALLETS AND ALL ASSOICATED DATA
   */

  const [currRooms, setCurrRooms] = useState<
    { roomName: string | null; roomData: JSON; recipients: [] }[]
  >([]);
  useEffect(() => {
    console.log("========= UPDATED ROOMS ARE: ", currRooms);
  }, [currRooms]);

  /*
  [START] USE EFFECTS FOR INITIALIZING THE STATE VARIABLES ON APP LOAD. 
  WE CAN DO THIS ON USER INTERACTION TOO, ITS JUST BETTER TO MAKE SURE WE INITIALIZE 
  THE APP PROPERLY WHEN WE ALREADY HAVE THE REQUIRED DATA
  */
  const onSubmitHandler = async (
    event: any | React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    // event.stopPropagation();
    // event.persist();

    const form = event.target as HTMLFormElement;
    const files = event.target.files;

    if (!files || files.length === 0) {
      return alert("No files selected");
    }

    const file = files[0];
    // upload files
    const result = await (ipfs as IPFSHTTPClient).add(file);
    console.log(result);
    setFileHash(result.path);
    console.log(fileHash, "filee hashh");
  };
  console.log(currRooms, "================================curr rooms");
  // useEffect to set accounts
  useEffect(() => {
    localStorage.setItem("accs", JSON.stringify(accounts));
  }, [accounts, currAcc]);

  // useEffect to set all available wallets and adding those to ylide sdk
  useEffect(() => {
    if (!ylide) {
      return;
    }
    (async () => {
      const availableWallets = await Ylide.getAvailableWallets();
      setWallets(
        await Promise.all(
          availableWallets.map(async (w) => {
            return {
              factory: w,
              wallet: await ylide.addWallet(w.blockchainGroup, w.wallet, {
                dev: true, //true,
                onNetworkSwitchRequest: async (
                  reason: string,
                  currentNetwork: EVMNetwork | undefined,
                  needNetwork: EVMNetwork,
                  needChainId: number
                ) => {
                  alert(
                    "Wrong network (" +
                      (currentNetwork
                        ? EVM_NAMES[currentNetwork]
                        : "undefined") +
                      "), switch to " +
                      EVM_NAMES[needNetwork]
                  );
                },
              }),
            };
          })
        )
      );
    })();
  }, [ylide]);

  // useEffect to setup the account states with associated wallets and local/remote keys.
  // this will register the remoteKey if available from ylide,
  // otherwise we'll have to ask the user to publish their keys to the selected blockchain
  useEffect(() => {
    if (!wallets.length) {
      return;
    }
    (async () => {
      const result: Record<
        string,
        {
          wallet: {
            wallet: AbstractWalletController;
            factory: WalletControllerFactory;
          } | null;
          localKey: YlideKeyPair | null;
          remoteKey: Uint8Array | null;
        }
      > = {};
      for (let acc of accounts) {
        const wallet = wallets.find((w) => w.factory.wallet === acc.wallet);
        result[acc.address] = {
          wallet: wallet || null,
          localKey:
            keys.find((k) => k.address === acc.address)?.keypair || null,
          remoteKey:
            (
              await Promise.all(
                readers.map(async (r) => {
                  if (!r.isAddressValid(acc.address)) {
                    return null;
                  }
                  const c = await r.extractPublicKeyFromAddress(acc.address);
                  if (c) {
                    console.log(`found public key for ${acc.address} in `, r);
                    return c.bytes;
                  } else {
                    return null;
                  }
                })
              )
            ).find((t) => !!t) || null,
        };
      }
      console.log("========= setting account state: ", result);
      setAccountsState(result);
    })();
  }, [accounts, keys, readers, wallets, currAcc]);

  const handlePasswordRequest = useCallback(async (reason: string) => {
    return prompt(`Enter Ylide password for ${reason}`);
  }, []);
  const handleDeriveRequest = useCallback(
    async (
      reason: string,
      blockchain: string,
      wallet: string,
      address: string,
      magicString: string
    ) => {
      const state = accountsState[address];
      if (!state) {
        return null;
      }
      try {
        return state.wallet!.wallet.signMagicString(
          { address, blockchain, publicKey: null },
          magicString
        );
      } catch (err) {
        return null;
      }
    },
    [accountsState]
  );
  useEffect(() => {
    keystore.options.onPasswordRequest = handlePasswordRequest;
    keystore.options.onDeriveRequest = handleDeriveRequest;
  }, [handlePasswordRequest, handleDeriveRequest, keystore]);

  // setting up the ylide SDK, READERS AND KEYS once they're available from above useEffect functions
  useEffect(() => {
    (async () => {
      await keystore.init();
      const _ylide = new Ylide(keystore);
      const _readers = [
        // await _ylide.addBlockchain("everscale", {
        //   dev: false, //true,
        // }),
        // await _ylide.addBlockchain("ETHEREUM"),
        // await _ylide.addBlockchain("BNBCHAIN"),
        // await _ylide.addBlockchain("POLYGON"),
        await _ylide.addBlockchain("ARBITRUM"),
        // await _ylide.addBlockchain("OPTIMISM"),
        // await _ylide.addBlockchain("AVALANCHE"),
      ];
      setYlide(_ylide);
      setReaders(_readers);
      setKeys([...keystore.keys]);
    })();
  }, [keystore]);

  // useEffect to get the connected wallets in the app state
  useEffect(() => {
    (async () => {
      const list = Ylide.walletsList;
      const result: {
        factory: WalletControllerFactory;
        isAvailable: boolean;
      }[] = [];
      for (const { factory } of list) {
        result.push({
          factory,
          isAvailable: await factory.isWalletAvailable(),
        });
      }
      setWalletsList(result);
    })();
  }, []);
  /*
  [END] USE EFFECTS FOR INITIALIZING THE STATE VARIABLES ON APP LOAD. 
  WE CAN DO THIS ON USER INTERACTION TOO, ITS JUST BETTER TO MAKE SURE WE INITIALIZE 
  THE APP PROPERLY WHEN WE ALREADY HAVE THE REQUIRED DATA
  */

  async function seeWalletList() {
    console.log("======== wallet list is: ", walletsList);
  }

  async function addAccount(factory: WalletControllerFactory) {
    const tempWallet = await factory.create({
      onNetworkSwitchRequest: () => {},
    });
    const newAcc = await tempWallet.requestAuthentication();
    if (!newAcc) {
      alert("Auth was rejected");
      return;
    }
    const exists = accounts.some((a) => a.address === newAcc.address);
    if (exists) {
      setCurrAcc({
        wallet: factory.wallet,
        address: newAcc.address,
      });
      // alert(`Account: ${newAcc.address} is already authenticated and registered in the app state`);
      return;
    }
    setAccounts(
      accounts.concat([
        {
          wallet: factory.wallet,
          address: newAcc.address,
        },
      ])
    );
    setCurrAcc({
      wallet: factory.wallet,
      address: newAcc.address,
    });
    // alert(`Account: ${newAcc.address} has been authenticated and added to the app state. ${currAcc?.address}`);
  }

  async function getAddedAccounts() {
    console.log("=========== added accounts are: ", accounts);
  }

  async function generateKey(wallet: string, address: string) {
    const account = accountsState[address];
    const password = await keystore.options.onPasswordRequest(
      `Generation key for ${address}`
    );
    if (!password) {
      return;
    }

    if (!account || !account.wallet) {
      alert(`Wallet has not been initialized for this address: ${address}`);
      return;
    }

    console.log(
      "========= Generating KEY: ",
      wallet,
      address,
      password,
      account.wallet!.factory.blockchainGroup
    );
    const k = await keystore.create(
      `Generation key for ${address}`,
      account.wallet!.factory.blockchainGroup,
      wallet,
      address,
      password
    );
    // Switch key storage mode to decrypted
    await k.storeUnencrypted(password);
    // Save the key in the storage again
    await keystore.save();
    // document.location.reload();
    // alert(`done generating key locally for address: ${address}`);
  }

  const publishKey = useCallback(
    async (wallet: string, address: string) => {
      const account = accountsState[address];
      const k = account.localKey?.publicKey;
      if (k) {
        account.wallet!.wallet.attachPublicKey(
          { address, blockchain: "", publicKey: null },
          k,
          {
            address,
            network: EVMNetwork.ARBITRUM,
          }
        );
      } else {
        console.log("======== localKey?.publicKey not there!");
        // alert("Please generate the key and reload the page to get the local public key in state!");
      }
    },
    [accountsState]
  );

  async function createRoom(
    roomName: string,
    creatorAddr: string,
    recipientAccounts: string[]
  ) {
    if (!ylide) {
      alert("No ylide sdk initialized. Reload the page");
      return;
    }
    const fromAcc = accounts.find((a) => a.address === creatorAddr);
    if (!fromAcc) {
      alert("Specify the room creator...");
      return;
    }
    const state = accountsState[fromAcc.address];
    if (!state) {
      console.log(
        "Room creator does not have state initialized. Do the above operations first to register the creator"
      );
      return;
    }

    const createRoomSubject = `ROOM CREATED:${roomName}`;
    recipientAccounts.push(creatorAddr);
    const createRoomBody = {
      creator_address: fromAcc,
      roomName: roomName,
      recipients: recipientAccounts,
    };
    const content = MessageContentV3.plain(
      createRoomSubject,
      JSON.stringify(createRoomBody)
    );
    const msgId = await ylide.sendMessage(
      {
        wallet: state.wallet!.wallet,
        sender: (await state.wallet!.wallet.getAuthenticatedAccount())!,
        content,
        recipients: recipientAccounts,
      },
      { network: EVMNetwork.ARBITRUM }
    );
    // alert(`Room Created with MessageId: ${msgId}`);
    console.log(`Room Created with MessageId: ${msgId}`);
  }

  async function GetMyRooms(addr: string) {
    const r = readers[0];
    const account = accountsState[addr];
    // console.log(r, account, "raccount");
    // if (!r || !account) {
    //   // alert("Please reload the page to make sure readers and accounts have been initialized");
    //   return;
    // }
    const a = r.addressToUint256(addr);
    console.log(addr);
    const messages = await r.retrieveMessageHistoryByBounds(addr, a);
    console.log("========= all messages are: ", messages);
    console.log(messages, "message");

    let roomsArr = [];
    for (var message of messages) {
      const content = await r.retrieveAndVerifyMessageContent(message);
      if (!content || content.corrupted) {
        // check content integrity
        throw new Error("Content not found or corrupted");
      }
      const pubKey = account.localKey?.publicKey;
      console.log(pubKey, "pubKey");
      if (pubKey) {
        const decodedContent = await ylide?.decryptMessageContent(
          {
            address: addr || "",
            blockchain: "evm",
            publicKey: PublicKey.fromPackedBytes(pubKey),
          }, // recipient account
          message, // message header
          content // message content
        );
        // console.log("======== decoded content is: ", decodedContent);
        if (decodedContent?.subject.startsWith("ROOM CREATED")) {
          console.log(
            `got a room: ${decodedContent.subject.split(":")[1]} with data: ${
              decodedContent.content
            }`
          );
          roomsArr.push({
            roomName: decodedContent.subject.split(":")[1],
            roomData: JSON.parse(decodedContent.content),
            recipients: JSON.parse(decodedContent.content)["recipients"],
          });
        }
      } else {
        console.log("========= no public key!");
        // alert("make sure generate and publish functions have been called and app state is initialized");
      }
    }
    setCurrRooms(roomsArr);
  }

  async function GetUserRoomDetails(addr: string, roomName: string) {
    const r = readers[0];
    const account = accountsState[addr];

    if (!r || !account) {
      alert(
        "Please reload the page to make sure readers and accounts have been initialized"
      );
      return;
    }

    var addrUnit256 = account.wallet?.wallet.addressToUint256(addr) || null;
    // console.log("======== account (addrUnit256) is: ", addrUnit256);
    // console.log("======== account is: ", account);
    const a = r.addressToUint256(addr);
    console.log("======== account (addrUnit256) is: ", a);

    const messages = await r.retrieveMessageHistoryByBounds(addr, a);
    console.log("========= all messages are: ", messages);

    for (var message of messages) {
      const content = await r.retrieveAndVerifyMessageContent(message);
      if (!content || content.corrupted) {
        // check content integrity
        throw new Error("Content not found or corrupted");
      }
      // console.log("content is: ", content);
      // console.log("message is: ", message);
      // console.log("======== keystore keys are: ", keystore.get(addr));

      const pubKey = account.localKey?.publicKey;
      if (pubKey) {
        const decodedContent = await ylide?.decryptMessageContent(
          {
            address: addr || "",
            blockchain: "evm",
            publicKey: PublicKey.fromPackedBytes(pubKey),
          }, // recipient account
          message, // message header
          content // message content
        );
        // console.log("======== decoded content is: ", decodedContent);
        if (decodedContent?.subject.startsWith("ROOM CREATED")) {
          console.log(
            `got a room: ${decodedContent.subject.split(":")[1]} with data: ${
              decodedContent.content
            }. Asked room: ${roomName}`
          );
          const rName = decodedContent.subject.split(":")[1];
          if (rName == roomName) {
            return decodedContent.content;
          }
        }
      } else {
        console.log("========= no public key!");
        // alert("make sure generate and publish functions have been called and app state is initialized");
      }
    }
  }

  function isRoomAdmin(roomData: any) {
    if (!currAcc) {
      alert("Please connect wallet to proceed");
      return false;
    }
    if (roomData["creator_address"]["address"] == currAcc.address) {
      console.log(
        "Admin room detected!",
        currAcc.address,
        roomData["creator_address"]["address"]
      );
      return true;
    }
    return false;
  }

  async function GetCreatorRoomByName(roomName: string, creatorAddr: string) {
    const roomDetails = await GetUserRoomDetails(creatorAddr, roomName);
    console.log("room details are: ", roomDetails);
  }

  async function CreatePost(
    roomName: string,
    postSubject: string,
    postBody: string,
    uploadUrlHash: string,
    creatorAddr: string
  ) {
    const roomDetails = await GetUserRoomDetails(creatorAddr, roomName);
    console.log("room details are: ", roomDetails);

    const rDetails = JSON.parse(roomDetails);
    console.log("All Recipients are: ", rDetails["recipients"]);

    console.log(fileHash);
    const reps = rDetails["recipients"];
    sendPostMessage(
      creatorAddr,
      roomName,
      postSubject,
      postBody,
      fileHash,
      reps
    );
  }

  async function sendPostMessage(
    creatorAddr: string,
    roomName: string,
    postSubject: string,
    postBody: string,
    uploadUrlHash: string,
    recipientAccounts: string[]
  ) {
    if (!ylide) {
      alert("No ylide sdk initialized. Reload the page");
      return;
    }
    const fromAcc = accounts.find((a) => a.address === creatorAddr);
    if (!fromAcc) {
      alert("Specify the room creator...");
      return;
    }
    const state = accountsState[fromAcc.address];
    if (!state) {
      console.log(
        "Room creator does not have state initialized. Do the above operations first to register the creator"
      );
      return;
    }

    const msgSubject = `POST:${postSubject}`;
    const msgBody = {
      creator_address: fromAcc,
      post: postBody,
      room: roomName,
      fileHash,
    };
    const content = MessageContentV3.plain(msgSubject, JSON.stringify(msgBody));
    const msgId = await ylide.sendMessage(
      {
        wallet: state.wallet!.wallet,
        sender: (await state.wallet!.wallet.getAuthenticatedAccount())!,
        content,
        recipients: recipientAccounts,
      },
      { network: EVMNetwork.ARBITRUM }
    );
    alert(`Post Message Sent with MessageId: ${msgId}`);
    console.log(`Post Message Sent with MessageId: ${msgId}`);
  }

  const storeFileHash = (hash: string) => {
    console.log(hash, fileHash, "asassasasssaas");
    setFileHash(hash);
  };
  async function ReadPostMessages(addr: string, roomName: string) {
    const r = readers[0];
    const account = accountsState[addr];
    const allMsgs = [];

    console.log(r, account, "raccount");
    if (!r || !account) {
      alert(
        "Please reload the page to make sure readers and accounts have been initialized"
      );
      return;
    }

    var addrUnit256 = account.wallet?.wallet.addressToUint256(addr) || null;
    const a = r.addressToUint256(addr);
    const messages = await r.retrieveMessageHistoryByBounds(addr, a);
    console.log("========= all messages are: ", messages);

    for (var message of messages) {
      const content = await r.retrieveAndVerifyMessageContent(message);
      if (!content || content.corrupted) {
        // check content integrity
        throw new Error("Content not found or corrupted");
      }
      // console.log("content is: ", content);
      // console.log("message is: ", message);
      // console.log("======== keystore keys are: ", keystore.get(addr));

      const pubKey = account.localKey?.publicKey;
      if (pubKey) {
        const decodedContent = await ylide?.decryptMessageContent(
          {
            address: addr || "",
            blockchain: "evm",
            publicKey: PublicKey.fromPackedBytes(pubKey),
          }, // recipient account
          message, // message header
          content // message content
        );
        // console.log("======== decoded content is: ", decodedContent);
        if (decodedContent?.subject.startsWith("POST")) {
          console.log(
            `got a post with subject: ${
              decodedContent.subject.split(":")[1]
            } with data: ${decodedContent.content}. and room: ${roomName}`
          );
          const sub = decodedContent.subject.split(":")[1];
          const msg = JSON.parse(decodedContent.content);
          console.log(
            `Post subject: ${sub}, body: ${msg}, room: ${msg["room"]}, fileHash:${msg}`
          );
          console.log(msg, "msg");
          if (msg["room"] == roomName) {
            allMsgs.push({
              msg: msg,
              sub: sub,
            });
          }
        }
      } else {
        console.log("========= no public key!");
        // alert("make sure generate and publish functions have been called and app state is initialized");
      }
    }
    return allMsgs;
  }

  async function isCurrAccountOnboarded() {
    const result: Record<
      string,
      {
        wallet: {
          wallet: AbstractWalletController;
          factory: WalletControllerFactory;
        } | null;
        localKey: YlideKeyPair | null;
        remoteKey: Uint8Array | null;
      }
    > = {};
    if (currAcc) {
      const wallet = wallets.find((w) => w.factory.wallet === currAcc.wallet);
      result[currAcc.address] = {
        wallet: wallet || null,
        localKey:
          keys.find((k) => k.address === currAcc.address)?.keypair || null,
        remoteKey:
          (
            await Promise.all(
              readers.map(async (r) => {
                if (!r.isAddressValid(currAcc.address)) {
                  return null;
                }
                const c = await r.extractPublicKeyFromAddress(currAcc.address);
                if (c) {
                  console.log(
                    `NEW found public key for ${currAcc.address} in `,
                    r
                  );
                  return c.bytes;
                } else {
                  return null;
                }
              })
            )
          ).find((t) => !!t) || null,
      };
      setCurrAccState(result);
      return true;
    }
    return false;
  }

  const [createRoomModal, setCreateRoomModal] = useState(false);
  const handleCreateRoomClose = () => setCreateRoomModal(false);
  const handleCreateRoomShow = () => setCreateRoomModal(true);

  const [fileHash, setFileHash] = useState("");

  const [onboardModal, setOnboardModal] = useState(false);
  const handleOnboardModalClose = () => setOnboardModal(false);
  const handleOnboardModalShow = () => setOnboardModal(true);

  const [roomMsgsModal, setRoomMsgsModal] = useState(false);
  const handleRoomMsgsModalClose = () => setRoomMsgsModal(false);
  const handleRoomMsgsModalShow = () => setRoomMsgsModal(true);

  const [createPostModal, setCreatePostModal] = useState(false);
  const handleCreatePostModalClose = () => setCreatePostModal(false);
  const handleCreatePostModalShow = () => setCreatePostModal(true);

  const [selectedRoomMsgs, setSelectedRoomMsgs] = useState<
    | {
        roomName: string;
        posts: { fileHash?: string; msg: any; sub: string }[] | undefined;
        fileHash?: string;
      }
    | undefined
  >();

  async function submitCreateRoomForm() {
    const rNameText = (
      document.getElementById("txtRoomName") as HTMLInputElement
    ).value;
    const rRepsText = (
      document.getElementById("txtRoomReps") as HTMLInputElement
    ).value;
    const allResp = rRepsText.split(",");
    if (currAcc) {
      console.log("======= all data in array: ", allResp);
      await createRoom(rNameText, currAcc?.address, allResp);
      alert("Room Created Successfully!");
      handleCreateRoomClose();
    } else {
      alert("Account not connected.. please connect account");
    }
  }

  async function submitCreatePostModal() {
    const pTitle = (document.getElementById("txtPostTitle") as HTMLInputElement)
      .value;
    const pBody = (document.getElementById("txtPostBody") as HTMLInputElement)
      .value;
    if (currAcc && selectedRoomMsgs) {
      await CreatePost(
        selectedRoomMsgs?.roomName,
        pTitle,
        pBody,
        fileHash,
        currAcc.address
      );
      alert("Post Created Successfully!");
      console.log(fileHash, "filehash in ap");
      handleCreatePostModalClose();
    } else {
      alert("Account not connected.. please connect account");
    }
  }

  async function submitGenerateKey() {
    if (!currAcc) {
      alert(
        "Please connect your wallet to be able to generate Communication Keys"
      );
      return;
    }
    await generateKey(currAcc.wallet, currAcc.address);
  }

  async function submitRegisterKey() {
    if (!currAcc) {
      alert(
        "Please connect your wallet to be able to generate Communication Keys"
      );
      return;
    }
    await publishKey(currAcc.wallet, currAcc.address);
  }

  async function SeeRoomMessages(selectedRoom: string | null) {
    if (!currAcc) {
      alert(
        "Please connect your wallet to be able to generate Communication Keys"
      );
      return;
    }
    if (!selectedRoom) {
      alert("No Room selected!");
      return;
    }
    const gotMsgs = await ReadPostMessages(currAcc.address, selectedRoom);
    console.log("========== all posts data is: ", gotMsgs);
    setSelectedRoomMsgs({
      roomName: selectedRoom,
      posts: gotMsgs,
    });
    handleRoomMsgsModalShow();
  }

  async function CreatePostMessageForRoom(selectedRoom: string | null) {
    if (!currAcc) {
      alert(
        "Please connect your wallet to be able to generate Communication Keys"
      );
      return;
    }
    if (!selectedRoom) {
      alert("No Room selected!");
      return;
    }
    setSelectedRoomMsgs({
      roomName: selectedRoom,
      posts: [],
    });
    handleCreatePostModalShow();
  }

  return (
    <div className="App">
      <Navbar bg="light" expand="lg">
        <Container fluid>
          <div className="d-flex justify-content-center align-items-center ml-2 ml-lg-0">
            <Button
              variant="dark"
              className="d-lg-none btn-fill d-flex justify-content-center align-items-center rounded-circle p-2"
            >
              <i className="fas fa-ellipsis-v"></i>
            </Button>
            <Navbar.Brand href="#" className="">
              P2P File Communication
            </Navbar.Brand>
          </div>
          <Navbar.Toggle aria-controls="basic-navbar-nav" className="mr-2">
            <span className="navbar-toggler-bar burger-lines"></span>
            <span className="navbar-toggler-bar burger-lines"></span>
            <span className="navbar-toggler-bar burger-lines"></span>
          </Navbar.Toggle>
          {currAcc ? (
            <Button variant="primary" onClick={handleOnboardModalShow}>
              Onboard Account
            </Button>
          ) : (
            ""
          )}
          {currAcc ? (
            <Button variant="success">Wallet Connected</Button>
          ) : (
            <Button onClick={() => addAccount(walletsList[0].factory)}>
              Connect Wallet
            </Button>
          )}
        </Container>
      </Navbar>

      {currAcc ? (
        <Container fluid>
          <Card>
            <Card.Body>
              <Card.Title>Connected Address</Card.Title>
              <Card.Subtitle className="mb-2 text-muted">
                {currAcc.address}
              </Card.Subtitle>
            </Card.Body>
          </Card>
          <Row className="mt-2">
            <Navbar bg="light" expand="lg">
              <Container fluid>
                <div className="d-flex justify-content-center align-items-center ml-2 ml-lg-0">
                  <Button
                    variant="primary"
                    onClick={() => GetMyRooms(currAcc?.address)}
                  >
                    My Private Rooms
                  </Button>
                </div>
                <div className="d-flex justify-content-right align-items-right ml-2 ml-lg-0">
                  <Button variant="danger" onClick={handleCreateRoomShow}>
                    Create a Private Room
                  </Button>
                </div>
              </Container>
            </Navbar>
          </Row>
        </Container>
      ) : (
        // <IntroPage />
        <div className="banner">
          <div className="container">
            <h1 className="font-weight-semibold">
              P2P Communication with File Sharing
            </h1>

            <h4 className="font-weight-normal text-muted pb-3">
              Use our P2P File Communication to create a private and secure chat
              with file sharing with other Web3 Users, and send encrypted
              messages and files to their addresses! <br />
              Using the power of blockchain and Ylide, whisper away your private
              communications without worrying about third parties eavesdropping
              on your privacy.
            </h4>
            <h6 className="font-weight-normal text-muted pb-3">
              Requires Arbitrum Wallet
            </h6>
            <div>
              <Button
                variant="primary"
                className="btn btn-opacity-light mr-1"
                onClick={() => addAccount(walletsList[0].factory)}
              >
                Get started
              </Button>
            </div>
            <img
              src={require("./assets/img/Group171.svg")}
              alt=""
              className="img-fluid"
            ></img>
          </div>

          <br />
          <br />
          <section className="features-overview" id="features-section">
            <div className="d-md-flex justify-content-between">
              <div className="col-md-4">
                <div className="features-width">
                  <img src="images/Group12.svg" alt="" className="img-icons" />
                  <h5 className="py-3">
                    Web3
                    <br />
                    First
                  </h5>
                  <p className="text-muted">
                    We use the power of cryptography to make encrypt all
                    communications on blockchain
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="features-width">
                  <img src="images/Group7.svg" alt="" className="img-icons" />
                  <h5 className="py-3">
                    Cross-Chain
                    <br />
                    Platform
                  </h5>
                  <p className="text-muted">
                    P2P File Communication can be created cross-chain, without
                    limiting the power of secure communications to a single
                    ecosystem
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="features-width">
                  <img src="images/Group5.svg" alt="" className="img-icons" />
                  <h5 className="py-3">
                    Purely <br /> Decentralised
                  </h5>
                  <p className="text-muted">
                    Just keep your wallet and communication private Key to
                    yourself, no one will be able to see your communications by
                    any means!
                  </p>
                </div>
              </div>
            </div>
          </section>

          <br />
          <br />
        </div>
      )}

      {currAcc && currRooms.length > 0 ? (
        <Container fluid>
          <Row xs={1} md={2} lg={4} className="g-4">
            {currRooms.map((r) => (
              <Col>
                <Card>
                  <div className="card-image">
                    <img
                      alt="Room Placeholder Image"
                      src={require("./assets/img/photo-1431578500526-4d9613015464.jpeg")}
                      width="100%"
                    ></img>
                  </div>
                  <Card.Body>
                    <Card.Title>{r.roomName}</Card.Title>
                    {isRoomAdmin(r.roomData) ? (
                      <Card.Text>
                        Your Private Room {r.roomName} with{" "}
                        {r.recipients.length - 1} recipients. This room remains
                        private and only the recipients can see your messages!
                      </Card.Text>
                    ) : (
                      <Card.Text>
                        Your Private Access is authorized for {r.roomName}
                      </Card.Text>
                    )}
                  </Card.Body>
                  <hr></hr>
                  <div className="button-container mr-auto ml-auto mb-2 justify-content-right align-items-right">
                    <Button
                      className="btn-simple btn-icon"
                      onClick={() => SeeRoomMessages(r.roomName)}
                      size="sm"
                      variant="primary"
                    >
                      Show My Messages
                    </Button>
                    {isRoomAdmin(r.roomData) ? (
                      <Button
                        className="btn-simple btn-icon ml-2"
                        onClick={() => CreatePostMessageForRoom(r.roomName)}
                        size="sm"
                        variant="primary"
                      >
                        Create New Post
                      </Button>
                    ) : (
                      ""
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      ) : (
        <Container fluid></Container>
      )}

      <Modal
        show={createRoomModal}
        onHide={handleCreateRoomClose}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create a new Private Room</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="txtRoomName">
              <Form.Label>Room Name</Form.Label>
              <Form.Control type="text" placeholder="Enter Room Name" />
            </Form.Group>

            <Form.Group className="mb-3" controlId="txtRoomReps">
              <Form.Label>Recipients List</Form.Label>
              <Form.Control
                type="textarea"
                placeholder="Comma Separated list of all recipient addresses"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => submitCreateRoomForm()}>
              Submit
            </Button>
            <Button variant="secondary" onClick={handleCreateRoomClose}>
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={onboardModal}
        onHide={handleOnboardModalClose}
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Onboard your Connected Wallet Account</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            Ylide requires the connected wallet address to generate their
            commuication keys and register these keys via Ylide SDK. <br />
            For first time users, P2P File Communication allows for generation
            and registering these communication keys. Use the following buttons
            to first generate the keys and registering that key with Ylide. Once
            done, the user should be able to create private P2P File
            Communication and read messages sent to their rooms.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => submitGenerateKey()}>
              Generate Key
            </Button>
            <Button variant="primary" onClick={() => submitRegisterKey()}>
              Register Key
            </Button>
            <Button variant="secondary" onClick={handleOnboardModalClose}>
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={roomMsgsModal}
        onHide={handleRoomMsgsModalClose}
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Showing Posts for {selectedRoomMsgs?.roomName}
          </Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            {selectedRoomMsgs?.posts?.map((p) => (
              <Alert variant="success">
                <Alert.Heading>{p.sub}</Alert.Heading>
                <p>{p.msg.post}</p>
                {p.fileHash !== "" ? (
                  <a href={`https://ipfs.io/ipfs/${p.msg.fileHash}`}>
                    {p.msg.fileHash}
                  </a>
                ) : (
                  <></>
                )}
                <hr />
                {/* <p className="mb-0">
                  Message Sent Privately to you! Make sure no one looks at your screen!
                </p> */}
              </Alert>
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleRoomMsgsModalClose}>
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={createPostModal}
        onHide={handleCreatePostModalClose}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Create a new Post for {selectedRoomMsgs?.roomName}
          </Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="txtPostTitle">
              <Form.Label>Post Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Post Title for your secret Post"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="txtPostBody">
              <Form.Label>Post Body</Form.Label>
              <Form.Control
                type="textarea"
                placeholder="Enter Post Data for your Secret Post"
              />
              <form onSubmit={onSubmitHandler}>
                <input
                  name="file"
                  type="file"
                  onChange={(e: any) => onSubmitHandler(e)}
                />
                {/* <button type="submit">Get File Encrypted</button> */}
              </form>
              {/* <IpfsUploader setFileHash={storeFileHash} /> */}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => submitCreatePostModal()}>
              Submit
            </Button>
            <Button variant="secondary" onClick={handleCreatePostModalClose}>
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default App;
