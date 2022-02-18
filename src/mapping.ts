import { BigInt } from "@graphprotocol/graph-ts"
import {
  Auctions,
  AccountUpdated,
  AuctionApprovalUpdated,
  AuctionBid,
  AuctionCanceled,
  AuctionCreated,
  AuctionDurationExtended,
  AuctionEnded,
  AuctionReservePriceUpdated,
  CreatorAdded,
  CreatorRemoved,
  FeeUpdated,
  HouseCreated,
  MetadataUpdated
} from "../generated/Auctions/Auctions"
import { Account, Auction, House, Contract, Totals } from "../generated/schema"

export function handleAccountUpdated(event: AccountUpdated): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = Account.load(event.transaction.from.toHexString())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new Account(event.transaction.from.toHexString())

    // Entity fields can be set using simple assignments
    entity.bids = 0
    entity.bidsReceived = 0
    entity.sales = 0
    entity.bought = 0
    entity.totalSold = BigInt.fromI32(0)
    entity.totalBought = BigInt.fromI32(0)
    entity.isCreator = false
    entity.isCollector = false
    entity.bidding = []
    entity.biddingTotal = 0
    entity.selling = []
    entity.sellingTotal = 0
  }

  let contract = Auctions.bind(event.address)
  let account = contract.accounts(event.transaction.from)

  entity.name = account.value0
  entity.bioHash = account.value1
  entity.pictureHash = account.value2

  // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  // entity.owner = event.params.owner

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.accounts(...)
  // - contract.auctions(...)
  // - contract.bids(...)
  // - contract.collectorStats(...)
  // - contract.contracts(...)
  // - contract.creatorStats(...)
  // - contract.getActiveHouses(...)
  // - contract.getAuctionBids(...)
  // - contract.getAuctions(...)
  // - contract.getBidderAuctions(...)
  // - contract.getCollections(...)
  // - contract.getCreatorHouses(...)
  // - contract.getCuratorHouses(...)
  // - contract.getHouseAuctions(...)
  // - contract.getHouseCreators(...)
  // - contract.getHouseQueue(...)
  // - contract.getPreviousAuctions(...)
  // - contract.getRankedCollectors(...)
  // - contract.getRankedContracts(...)
  // - contract.getRankedCreators(...)
  // - contract.getRankedHouses(...)
  // - contract.getSellerAuctions(...)
  // - contract.getTokenOffers(...)
  // - contract.houseIDs(...)
  // - contract.houses(...)
  // - contract.minimumIncrementPercentage(...)
  // - contract.offers(...)
  // - contract.timeBuffer(...)
  // - contract.tokenAuction(...)
  // - contract.totalActiveAuctions(...)
  // - contract.totalActiveHouseAuctions(...)
  // - contract.totalActiveHouses(...)
  // - contract.totalAuctions(...)
  // - contract.totalCollectors(...)
  // - contract.totalContracts(...)
  // - contract.totalCreators(...)
  // - contract.totalHouses(...)
  // - contract.tuxERC20(...)
}

export function handleAuctionApprovalUpdated(
  event: AuctionApprovalUpdated
): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction)
    return

  auction.approved = event.params.approved

  auction.save()

  let totals = Totals.load('1')
  if (!totals)
    return

  let house = House.load(auction.houseId.toString())

  if (house && auction.houseId > BigInt.fromI32(0)) {
    let activeAuctions = house.auctions
    if (!activeAuctions)
      activeAuctions = []

    if (auction.approved) {
      house.activeAuctions += 1
      activeAuctions.push(auction.id)
      house.lastUpdated = event.block.timestamp.toI32()
    }
    else {
      house.activeAuctions -= 1
      activeAuctions.splice(activeAuctions.indexOf(auction.id), 1)
    }
    house.auctions = activeAuctions

    house.save()
  }
  else {
    if (auction.approved)
      totals.auctions += BigInt.fromI32(1)
    else
      totals.auctions -= BigInt.fromI32(1)

    let activeAuctions = totals.active
    if (!activeAuctions)
      activeAuctions = []
    if (auction.approved)
      activeAuctions.push(auction.id)
    else
      activeAuctions.splice(activeAuctions.indexOf(auction.id), 1)
    totals.active = activeAuctions
  }

  let tokenContract = Contract.load(auction.contract.toHexString())
  if (!tokenContract)
    return
  let contractAuctions = tokenContract.auctions

  if (auction.approved) {
    contractAuctions.push(auction.id)
    tokenContract.totalAuctions += 1
    tokenContract.lastUpdated = event.block.timestamp.toI32()
  }
  else {
    contractAuctions.splice(contractAuctions.indexOf(auction.id), 1)
    tokenContract.totalAuctions -= 1

    if (tokenContract.totalAuctions === 0)
      totals.contracts -= BigInt.fromI32(1)
  }

  tokenContract.auctions = contractAuctions
  tokenContract.save()

  totals.save()
}

export function handleAuctionBid(event: AuctionBid): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction)
    return

  let totals = Totals.load('1')
  if (!totals)
    return

  let owner = Account.load(auction.owner.toHexString())
  if (!owner)
    return

  owner.bidsReceived += 1
  owner.save()

  let bidder = Account.load(event.transaction.from.toHexString())
  if (!bidder) {
    bidder = new Account(event.transaction.from.toHexString())
    bidder.bids = 0
    bidder.bidsReceived = 0
    bidder.sales = 0
    bidder.bought = 0
    bidder.totalSold = BigInt.fromI32(0)
    bidder.totalBought = BigInt.fromI32(0)
    bidder.isCreator = false
    bidder.isCollector = false
    bidder.biddingTotal = 0
    bidder.bidding = []
    bidder.sellingTotal = 0
    bidder.selling = []
  }

  let activeAuctions = bidder.bidding
  if (!activeAuctions)
    activeAuctions = []

  if (activeAuctions.indexOf(auction.id) === -1) {
    activeAuctions.push(auction.id)
    bidder.bidding = activeAuctions
    bidder.biddingTotal += 1
  }

  bidder.bids += 1

  if (!bidder.isCollector) {
    bidder.isCollector = true
    totals.collectors += BigInt.fromI32(1)
    totals.save()
  }

  bidder.save()

  if (event.params.firstBid)
    auction.firstBidTime = event.block.timestamp

  auction.bidder = event.params.bidder
  auction.amount = event.params.value
  auction.bids += 1

  auction.save()

  let house = House.load(auction.houseId.toString())
  if (house) {
    house.bids += 1
    house.lastUpdated = event.block.timestamp.toI32()
    house.save()
  }

  let tokenContract = Contract.load(auction.contract.toHexString())
  if (!tokenContract)
    return

  tokenContract.lastUpdated = event.block.timestamp.toI32()
  tokenContract.bids += 1
  tokenContract.save()
}

export function handleAuctionCanceled(event: AuctionCanceled): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction)
    return

  let totals = Totals.load('1')
  if (!totals)
    return

  let owner = Account.load(auction.owner.toHexString())
  if (!owner)
    return

  let activeAuctions = owner.selling
  if (activeAuctions) {
    activeAuctions.splice(activeAuctions.indexOf(auction.id.toString()), 1)
    owner.selling = activeAuctions
    owner.sellingTotal -= 1
  }

  owner.save()

  let house = House.load(auction.houseId.toString())

  if (house && auction.approved && auction.houseId > BigInt.fromI32(0)) {
    let activeAuctions = house.auctions
    if (!activeAuctions)
      activeAuctions = []
    else {
      activeAuctions.splice(activeAuctions.indexOf(auction.id.toString()), 1)
      house.activeAuctions -= 1
    }
    house.auctions = activeAuctions
    house.save()
  }
  else {
    totals.auctions -= BigInt.fromI32(1)

    if (auction.approved) {
      let activeAuctions = totals.active
      if (!activeAuctions)
        activeAuctions = []
      activeAuctions.splice(activeAuctions.indexOf(auction.id), 1)
      totals.active = activeAuctions
    }
  }

  auction.approved = false
  auction.save()

  let tokenContract = Contract.load(auction.contract.toHexString())
  if (!tokenContract)
    return
  let contractAuctions = tokenContract.auctions
  contractAuctions.splice(contractAuctions.indexOf(auction.id), 1)
  tokenContract.auctions = contractAuctions
  tokenContract.totalAuctions -= 1
  tokenContract.save()

  if (tokenContract.totalAuctions === 0)
    totals.contracts -= BigInt.fromI32(1)

  totals.save()
}

export function handleAuctionCreated(event: AuctionCreated): void {
  let entity = Auction.load(event.params.auctionId.toString())

  if (!entity)
    entity = new Auction(event.params.auctionId.toString())

  let contract = Auctions.bind(event.address)
  let auction = contract.auctions(BigInt.fromString(entity.id))

  entity.intId = event.params.auctionId.toI32()
  entity.contract = auction.value0
  entity.tokenId = auction.value1
  entity.owner = auction.value2
  entity.duration = auction.value3.toI32()
  entity.reservePrice = auction.value4
  entity.houseId = auction.value5
  entity.fee = auction.value6
  entity.approved = auction.value7
  entity.firstBidTime = auction.value8
  entity.amount = auction.value9
  entity.bidder = auction.value10
  entity.created = auction.value11
  entity.bids = 0

  entity.save()

  let totals = Totals.load('1')
  if (!totals) {
    totals = new Totals('1')
    totals.creators = BigInt.fromI32(0)
    totals.collectors = BigInt.fromI32(0)
    totals.contracts = BigInt.fromI32(0)
    totals.auctions = BigInt.fromI32(0)
    totals.houses = BigInt.fromI32(0)
    totals.active = []
  }

  let owner = Account.load(entity.owner.toHexString())
  if (!owner) {
    owner = new Account(entity.owner.toHexString())
    owner.bids = 0
    owner.bidsReceived = 0
    owner.sales = 0
    owner.bought = 0
    owner.totalSold = BigInt.fromI32(0)
    owner.totalBought = BigInt.fromI32(0)
    owner.isCreator = false
    owner.biddingTotal = 0
    owner.bidding = []
    owner.sellingTotal = 0
    owner.selling = []
  }

  let activeAuctions = owner.selling
  if (!activeAuctions)
    activeAuctions = []
  activeAuctions.push(entity.id)
  owner.selling = activeAuctions
  owner.sellingTotal += 1

  if (!owner.isCreator) {
    owner.isCreator = true
    totals.creators += BigInt.fromI32(1)
  }

  owner.save()

  let house = House.load(entity.houseId.toString())

  if (house && entity.approved && entity.houseId > BigInt.fromI32(0)) {
    house.activeAuctions += 1

    let activeAuctions = house.auctions
    if (!activeAuctions)
      activeAuctions = []
    activeAuctions.push(entity.id)
    house.auctions = activeAuctions
    house.lastUpdated = event.block.timestamp.toI32()

    house.save()
  }
  else {
    totals.auctions += BigInt.fromI32(1)

    if (entity.approved) {
      let activeAuctions = totals.active
      if (!activeAuctions)
        activeAuctions = []
      activeAuctions.push(entity.id)
      totals.active = activeAuctions
    }
  }

  let tokenContract = Contract.load(entity.contract.toHexString())
  let registered = contract.contracts(auction.value0)
  if (registered && !tokenContract) {
    tokenContract = new Contract(entity.contract.toHexString())
    tokenContract.address = entity.contract
    tokenContract.name = registered.value0
    tokenContract.bids = 0
    tokenContract.sales = 0
    tokenContract.lastUpdated = 0
    tokenContract.total = BigInt.fromI32(0)
    tokenContract.totalAuctions = 0
    tokenContract.auctions = []
    tokenContract.save()

    totals.contracts += BigInt.fromI32(1)
  }

  if (tokenContract && entity.approved) {
    let contractAuctions = tokenContract.auctions
    contractAuctions.push(entity.id)
    tokenContract.auctions = contractAuctions
    tokenContract.lastUpdated = event.block.timestamp.toI32()
    tokenContract.totalAuctions += 1
    tokenContract.save()
  }

  totals.save()
}

export function handleAuctionDurationExtended(
  event: AuctionDurationExtended
): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction)
    return

  auction.duration = event.params.duration.toI32()

  auction.save()
}

export function handleAuctionEnded(event: AuctionEnded): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (!auction)
    return

  let bidder = Account.load(auction.bidder.toHexString())
  if (!bidder)
    return

  let owner = Account.load(auction.owner.toHexString())
  if (!owner)
    return

  let totals = Totals.load('1')
  if (!totals)
    return

  let house = House.load(auction.houseId.toString())

  bidder.bought += 1
  bidder.totalBought += auction.amount
  owner.sales += 1
  owner.totalSold += auction.amount

  let bidderAuctions = bidder.bidding
  if (bidderAuctions.indexOf(auction.id) > -1) {
    bidderAuctions.splice(bidderAuctions.indexOf(auction.id), 1)
    bidder.bidding = bidderAuctions
    bidder.biddingTotal -= 1
  }

  bidder.save()

  let ownerAuctions = owner.selling
  if (ownerAuctions.indexOf(auction.id) > -1) {
    ownerAuctions.splice(ownerAuctions.indexOf(auction.id), 1)
    owner.selling = ownerAuctions
    owner.sellingTotal -= 1
  }

  owner.save()

  if (house && auction.houseId > BigInt.fromI32(0)) {
    house.sales += 1
    house.total += auction.amount
    house.activeAuctions -= 1
    // houses[houseId].feesTotal += curatorFee // TODO

    let activeAuctions = house.auctions
    if (activeAuctions) {
      activeAuctions.splice(activeAuctions.indexOf(auction.id.toString()), 1)
      house.auctions = activeAuctions
    }

    house.save()
  }
  else {
    totals.auctions -= BigInt.fromI32(1)

    let activeAuctions = totals.active
    if (activeAuctions) {
      activeAuctions.splice(activeAuctions.indexOf(auction.id), 1)
      totals.active = activeAuctions
    }
  }

  let tokenContract = Contract.load(auction.contract.toHexString())
  if (!tokenContract)
    return
  let contractAuctions = tokenContract.auctions
  contractAuctions.splice(contractAuctions.indexOf(auction.id), 1)
  tokenContract.auctions = contractAuctions
  tokenContract.total += auction.amount
  tokenContract.totalAuctions -= 1
  tokenContract.sales += 1
  tokenContract.save()

  if (tokenContract.totalAuctions === 0)
    totals.contracts -= BigInt.fromI32(1)

  totals.save()
}

export function handleAuctionReservePriceUpdated(
  event: AuctionReservePriceUpdated
): void {
  let auction = Auction.load(event.params.auctionId.toString())

  if (!auction)
    return

  auction.reservePrice = event.params.reservePrice

  auction.save()
}

export function handleCreatorAdded(event: CreatorAdded): void {
  let house = House.load(event.params.houseId.toString())

  if (!house)
    return

  let creators = house.creators
  creators.push(event.params.creator.toHexString())
  house.creators = creators

  house.save()
}

export function handleCreatorRemoved(event: CreatorRemoved): void {
  let house = House.load(event.params.houseId.toString())

  if (!house)
    return

  let creators = house.creators
  creators.splice(creators.indexOf(event.params.creator.toHexString()), 1)
  house.creators = creators

  house.save()
}

export function handleFeeUpdated(event: FeeUpdated): void {
  let house = House.load(event.params.houseId.toString())

  if (!house)
    return

  house.fee = event.params.fee

  house.save()
}

export function handleHouseCreated(event: HouseCreated): void {
  let entity = House.load(event.params.houseId.toString())

  if (!entity)
    entity = new House(event.params.houseId.toString())

  let contract = Auctions.bind(event.address)
  let house = contract.houses(BigInt.fromString(entity.id))

  entity.name = house.value0
  entity.curator = house.value1
  entity.fee = house.value2
  entity.preApproved = house.value3
  entity.bids = 0
  entity.sales = 0
  entity.total = BigInt.fromI32(0)
  entity.feesTotal = BigInt.fromI32(0)
  entity.activeAuctions = 0
  entity.lastUpdated = 0
  entity.auctions = []
  entity.save()

  let totals = Totals.load('1')
  if (!totals) {
    totals = new Totals('1')
    totals.creators = BigInt.fromI32(0)
    totals.collectors = BigInt.fromI32(0)
    totals.contracts = BigInt.fromI32(0)
    totals.auctions = BigInt.fromI32(0)
    totals.houses = BigInt.fromI32(0)
    totals.active = []
  }
  totals.houses += BigInt.fromI32(1)
  totals.save()
}

export function handleMetadataUpdated(event: MetadataUpdated): void {}
