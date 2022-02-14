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
import { ExampleEntity } from "../generated/schema"

export function handleAccountUpdated(event: AccountUpdated): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.owner = event.params.owner

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
): void {}

export function handleAuctionBid(event: AuctionBid): void {}

export function handleAuctionCanceled(event: AuctionCanceled): void {}

export function handleAuctionCreated(event: AuctionCreated): void {}

export function handleAuctionDurationExtended(
  event: AuctionDurationExtended
): void {}

export function handleAuctionEnded(event: AuctionEnded): void {}

export function handleAuctionReservePriceUpdated(
  event: AuctionReservePriceUpdated
): void {}

export function handleCreatorAdded(event: CreatorAdded): void {}

export function handleCreatorRemoved(event: CreatorRemoved): void {}

export function handleFeeUpdated(event: FeeUpdated): void {}

export function handleHouseCreated(event: HouseCreated): void {}

export function handleMetadataUpdated(event: MetadataUpdated): void {}
