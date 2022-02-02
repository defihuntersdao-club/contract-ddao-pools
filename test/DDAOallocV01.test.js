const { expect, assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const bn1e6 = ethers.BigNumber.from((10**6).toString());
const ZERRO = '0x0000000000000000000000000000000000000000';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const DEFAULT_TOKEN_ADDR = '0x753f470F3a283A8e99e5dacf9dD0eDf7F64a9F80';
const LEVEL_MIN_1 = 300;
const LEVEL_MIN_2 = 3000;
const LEVEL_MIN_3 = 5000;

let owner;
let payer1;
let payer2;
let payer3;

let ddaoAllocV01;
let usdcTest;

let DDAOAllocV01Contract = artifacts.require('DDAOallocV01');
let ddaoAllocV01Inst;

async function setAllocate() {
    await ddaoAllocV01.TokenAddrSet(usdcTest.address);
    await ddaoAllocV01.LevelMinChange(0, 25);
    await ddaoAllocV01.SaleModify(0, 'Sale', 'DDAO Selling', payer3.address, 0);
    await ddaoAllocV01.SaleDisable(0, false);
}

async function preparePayer1ToAllocate() {
    await setAllocate()

    const amount = ethers.BigNumber.from(50000).mul(bn1e6);
    await usdcTest.approve(owner.address, amount);
    await usdcTest.transferFrom(owner.address, payer1.address, amount);
    await usdcTest.connect(payer1).approve(ddaoAllocV01.address, amount);
}

describe("DDAOallocV01", function () {
    beforeEach(async function() {
        [owner, payer1, payer2, payer3] = await ethers.getSigners();

        DDAOallocV01 = await ethers.getContractFactory('DDAOallocV01');
        ERC20 = await ethers.getContractFactory('ERC20Base');

        ddaoAllocV01Inst = await DDAOAllocV01Contract.new();
        
        ddaoAllocV01 = await DDAOallocV01.deploy();

        usdcTest = await ERC20.deploy('Dev USDC (DEVUSDC)', 'USDC-Test', 6);
        await usdcTest.mint(owner.address, '10000000000000');
    })

    describe("constructor", function() {
        it("Should set default admin role", async function() {
            expect(await ddaoAllocV01.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.equal(true);
        });
        it("Should be set TokenAddr and LevelMin 1, 2, 3", async function() {
            expect(await ddaoAllocV01.TokenAddr()).to.be.equal(DEFAULT_TOKEN_ADDR);
            expect((await ddaoAllocV01.LevelMin(1)).toNumber()).to.be.equal(LEVEL_MIN_1);
            expect((await ddaoAllocV01.LevelMin(2)).toNumber()).to.be.equal(LEVEL_MIN_2);
            expect((await ddaoAllocV01.LevelMin(3)).toNumber()).to.be.equal(LEVEL_MIN_3);
        });
    })

    describe("IsAdmin", function() {
        it("Should be false as payer1 is not admin", async function() {
            expect(await ddaoAllocV01.IsAdmin(payer1.address)).to.be.equal(false);
        });
        it("Should be false as owner is admin", async function() {
            expect(await ddaoAllocV01.IsAdmin(owner.address)).to.be.equal(true);
        });
    })

    describe("AdminAdd", function() {
        it("Should be reverted as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).AdminAdd(payer1.address), "Access for Admin's only")
        });
        it("Should be added new admin", async function() {
            const tx = await ddaoAllocV01Inst.AdminAdd(payer1.address);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV01Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'adminModify', (ev) => {
                return ev.txt === 'Admin added' && ev.addr === payer1.address
            });
        });
        it("Should be reverted as payer1 has already been granted", async function() {
            await ddaoAllocV01.AdminAdd(payer1.address);
            await truffleAssert.reverts(ddaoAllocV01.AdminAdd(payer1.address), 'Account already ADMIN');
        });
    })
    
    describe("AdminDel", function() {
        it("Should be reverted as admin can't delete yourself", async function() {
            await ddaoAllocV01.AdminAdd(payer1.address);
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).AdminDel(payer1.address), 'You can`t remove yourself');
        })
        it("Should be reverted as payer2 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer2).AdminDel(payer1.address), "Access for Admin's only");
        })
        it("Should ve removed from admin", async function() {
            await ddaoAllocV01Inst.AdminAdd(payer1.address);
            const tx = await ddaoAllocV01Inst.AdminDel(payer1.address);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV01Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'adminModify', (ev) => {
                return ev.txt === 'Admin deleted' && ev.addr === payer1.address
            });
        })
        it("Should be reverted as user is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.AdminDel(payer1.address), "Account not ADMIN");
        })
    })

    describe("TokenAddrSet", function() {
        it("Should be reverted as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).TokenAddrSet(ZERRO), "Access for Admin's only");
        })
        it("Should be set new token address", async function() {
            const addr = await ddaoAllocV01.TokenAddr();
            await ddaoAllocV01.TokenAddrSet(ZERRO);
            expect(await ddaoAllocV01.TokenAddr()).to.not.equal(addr);
        })
    })

    describe("TokenAllowance", function() {
        it("Should be 0", async function() {
            await ddaoAllocV01.TokenAddrSet(usdcTest.address);
            expect((await ddaoAllocV01.TokenAllowance(payer1.address)).toString()).to.be.equal('0');
        })
        it("Should be more then 0", async function() {
            await ddaoAllocV01.TokenAddrSet(usdcTest.address);
            await usdcTest.connect(payer1).approve(ddaoAllocV01.address, ethers.BigNumber.from(50000).mul(bn1e6));
            expect((await ddaoAllocV01.TokenAllowance(payer1.address)).toNumber()).to.be.greaterThan(0);
        })
    })

    describe("TokenInfo", function() {
        it("Should return token info", async function() {
            const addr = await ddaoAllocV01.TokenAddr();
            await ddaoAllocV01.TokenAddrSet(usdcTest.address);
            const info = await ddaoAllocV01.TokenInfo();

            expect(info[0]).to.not.equal(addr);
            expect(info[1]).to.be.equal(6);
            expect(info[2]).to.be.equal('Dev USDC (DEVUSDC)');
            expect(info[3]).to.be.equal('USDC-Test');
            expect(info[4].toString()).to.be.equal('10000000000000');
        })
    })

    describe("SaleModify", function() {
        it("Should be revetred as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).SaleModify(0, 'Sale', 'Self modified sale', ZERRO, 0), "Access for Admin's only");
        })
        it("Should be modified", async function() {
            await ddaoAllocV01.SaleModify(1, 'Sale', 'Self modified sale', ZERRO, 0);
            expect((await ddaoAllocV01.SaleMax()).toNumber()).to.be.equal(1);
        })
        it("Should be equal id as SaleMax less than id", async function() {
            const id = (await ddaoAllocV01.SaleMax()).toNumber();
            await ddaoAllocV01.SaleModify(1, 'test', 'commtents', payer3.address, 0);
            expect((await ddaoAllocV01.SaleMax()).toNumber()).to.be.equal(1);
            
            await ddaoAllocV01.SaleModify(0, 'test', 'commtents', payer3.address, 0);
            expect((await ddaoAllocV01.SaleMax()).toNumber()).to.be.equal(1);
        })
    })

    describe("SaleDisable", function() {
        it("Should be revetred as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).SaleDisable(0, true), "Access for Admin's only");
        })
        it("Should be disabled sale", async function() {
            await ddaoAllocV01.SaleDisable(0, true);
            expect((await ddaoAllocV01.Sale(0)).disabled).to.be.equal(true);
        })
    })

    describe("SaleDisabled", function() {
        it("Should return disabled status", async function() {
            expect(await ddaoAllocV01.SaleDisabled(0)).to.be.equal(false);
        })
    })

    describe("LevelMinChange", function() {
        it("Should be revetred as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).LevelMinChange(0, 0), "Access for Admin's only");
        })
        it("Should be changed in level 0 min value", async function() {
            await ddaoAllocV01.LevelMinChange(0, 25);
            expect((await ddaoAllocV01.LevelMin(0)).toNumber()).to.be.equal(25);
        })
    })

    describe("Allocate", function() {
        it("Should be reverted as ID is disabled", async function() {
            await ddaoAllocV01.SaleDisable(0, true);
            await truffleAssert.reverts(ddaoAllocV01.Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6)), "Sale with this ID is disabled");
        })
        it("Should be reverted as not enought tokens", async function() {
            await ddaoAllocV01.TokenAddrSet(usdcTest.address);
            await truffleAssert.reverts(ddaoAllocV01.connect(payer1).Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6)), "Not enough tokens to receive");
        })
        it("Should be reverted as token is not approved", async function() {
            await ddaoAllocV01.TokenAddrSet(usdcTest.address);
            await truffleAssert.reverts(ddaoAllocV01.Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6)), "You need to be allowed to use tokens to pay for this contract [We are wait approve]");
        })
        it("Should be reverted as amount less than level min", async function() {
            await setAllocate();
            await usdcTest.approve(ddaoAllocV01.address, ethers.BigNumber.from(50000).mul(bn1e6));
            await truffleAssert.reverts(ddaoAllocV01.Allocate(0, 0, payer2.address, ethers.BigNumber.from(1).mul(bn1e6)), "Amount must be more then LevelMin for this level");
        })

        it("Should be added next AllocCount", async function() {
            await preparePayer1ToAllocate();
            await ddaoAllocV01.connect(payer1).Allocate(0, 0, payer2.address, ethers.BigNumber.from(25).mul(bn1e6));
            expect((await ddaoAllocV01.AllocCount()).toNumber()).to.be.equal(1);
        })
        
        it("Should be changed AllocInfo and left part should be different with right", async function() {
            await preparePayer1ToAllocate();
            const left = await ddaoAllocV01.AllocInfo(1);
            await ddaoAllocV01.connect(payer1).Allocate(0, 0, payer2.address, ethers.BigNumber.from(25).mul(bn1e6));
            const rigth = await ddaoAllocV01.AllocInfo(1);

            expect(rigth.number.toNumber()).to.be.greaterThan(left.number.toNumber());
            expect(rigth.blk.toNumber()).to.be.greaterThan(left.blk.toNumber());
            expect(rigth.time.toNumber()).to.be.greaterThan(left.time.toNumber());
            expect(rigth.sale.toNumber()).to.be.equal(left.sale.toNumber());
            expect(rigth.level).to.be.equal(left.level);
            expect(rigth.addr).to.not.equal(ZERRO);
            expect(rigth.payer).to.not.equal(ZERRO);
            expect(rigth.amount.toNumber()).to.not.equal(0);
        })

        it("Should be conncat prev amount with new in AllocAmount", async function() {
            await preparePayer1ToAllocate();
            const preAllocAmount = await ddaoAllocV01.AllocAmount();
            const amount = ethers.BigNumber.from(25).mul(bn1e6);
            await ddaoAllocV01.connect(payer1).Allocate(0, 0, payer2.address, amount);
            const newAllocAmount = ethers.BigNumber.from(preAllocAmount).add(amount).toNumber();
            expect((await ddaoAllocV01.AllocAmount()).toNumber()).to.be.equal(newAllocAmount);
        })

        it("Should be changed AllocSale.. and left part should be different with right", async function() {
            await preparePayer1ToAllocate();
            const sale = 0;
            const level = 0;
            const amount = ethers.BigNumber.from(25).mul(bn1e6);

            const leftAllocSaleCount = await ddaoAllocV01.AllocSaleCount(sale);
            const leftAllocSaleAmount = await ddaoAllocV01.AllocSaleAmount(sale);
            const leftAllocSaleId = await ddaoAllocV01.AllocSaleId(sale, leftAllocSaleCount);
            const leftAllocSaleLevelCount = await ddaoAllocV01.AllocSaleLevelCount(sale, level);
            const leftAllocSaleLevelAmount = await ddaoAllocV01.AllocSaleLevelAmount(sale, level);
            const leftAllocSaleLevelId = await ddaoAllocV01.AllocSaleLevelId(sale, level, leftAllocSaleLevelCount);
            
            await ddaoAllocV01.connect(payer1).Allocate(sale, level, payer2.address, amount);
            const rightAllocSaleCount = await ddaoAllocV01.AllocSaleCount(sale);
            const rightAllocSaleAmount = await ddaoAllocV01.AllocSaleAmount(sale);
            const rightAllocSaleId = await ddaoAllocV01.AllocSaleId(sale, rightAllocSaleCount);
            const rightAllocSaleLevelCount = await ddaoAllocV01.AllocSaleLevelCount(sale, level);
            const rightAllocSaleLevelAmount = await ddaoAllocV01.AllocSaleLevelAmount(sale, level);
            const rightAllocSaleLevelId = await ddaoAllocV01.AllocSaleLevelId(sale, level, rightAllocSaleLevelCount);

            expect(rightAllocSaleCount.toNumber()).to.be.greaterThan(leftAllocSaleCount.toNumber());
            expect(rightAllocSaleAmount.toNumber()).to.be.equal(leftAllocSaleAmount.toNumber() + amount.toNumber());
            expect(rightAllocSaleId.toNumber()).to.be.equal(leftAllocSaleId.toNumber() + 1);
            expect(rightAllocSaleLevelCount.toNumber()).to.be.equal(leftAllocSaleLevelCount.toNumber() + 1);
            expect(rightAllocSaleLevelAmount.toNumber()).to.be.equal(leftAllocSaleLevelAmount.toNumber() + amount.toNumber());
            expect(rightAllocSaleLevelId.toNumber()).to.be.equal(leftAllocSaleLevelId.toNumber() + rightAllocSaleCount.toNumber());
        })

        it("Should be changed Buyer.. and left part should be different with right", async function() {
            await preparePayer1ToAllocate();
            const sale = 0;
            const level = 0;
            const amount = ethers.BigNumber.from(25).mul(bn1e6);

            const leftBuyerCount = await ddaoAllocV01.BuyerCount(payer2.address);
            const leftBuyerAmount = await ddaoAllocV01.BuyerAmount(payer2.address);
            const leftBuyerSaleCount = await ddaoAllocV01.BuyerSaleCount(payer2.address, sale);
            const leftBuyerSaleAmount = await ddaoAllocV01.BuyerSaleAmount(payer2.address, sale);
            const leftBuyerSaleId = await ddaoAllocV01.BuyerSaleId(payer2.address, sale, leftBuyerSaleCount);
            const leftBuyerSaleLevelCount = await ddaoAllocV01.BuyerSaleLevelCount(payer2.address, sale, level);
            const leftBuyerSaleLevelAmount = await ddaoAllocV01.BuyerSaleLevelAmount(payer2.address, sale, level);
            const leftBuyerSaleLevelId = await ddaoAllocV01.BuyerSaleLevelId(payer2.address, sale, level, leftBuyerSaleLevelCount);
            
            // Make 2 sales
            await ddaoAllocV01.connect(payer1).Allocate(sale, level, payer2.address, amount);
            await ddaoAllocV01.connect(payer1).Allocate(sale, level, payer2.address, amount);
            
            const rightBuyerCount = await ddaoAllocV01.BuyerCount(payer2.address);
            const rightBuyerAmount = await ddaoAllocV01.BuyerAmount(payer2.address);
            const rightBuyerSaleCount = await ddaoAllocV01.BuyerSaleCount(payer2.address, sale);
            const rightBuyerSaleAmount = await ddaoAllocV01.BuyerSaleCount(payer2.address, sale);
            const rightBuyerSaleId = await ddaoAllocV01.BuyerSaleId(payer2.address, sale, rightBuyerSaleCount);
            const rightBuyerSaleLevelCount = await ddaoAllocV01.BuyerSaleLevelCount(payer2.address, sale, level);
            const rightBuyerSaleLevelAmount = await ddaoAllocV01.BuyerSaleLevelAmount(payer2.address, sale, level);
            const rightBuyerSaleLevelId = await ddaoAllocV01.BuyerSaleLevelId(payer2.address, sale, level, rightBuyerSaleLevelCount);

            expect(rightBuyerCount.toNumber()).to.be.equal(leftBuyerCount.toNumber() + 2);
            expect(rightBuyerAmount.toNumber()).to.be.equal(leftBuyerAmount.add(amount).mul(2).toNumber());
            expect(rightBuyerSaleCount.toNumber()).to.be.equal(leftBuyerSaleCount.toNumber() + 2);
            expect(rightBuyerSaleAmount.toNumber()).to.be.equal(leftBuyerSaleAmount.toNumber() + 2);
            expect(rightBuyerSaleId.toNumber()).to.be.equal(leftBuyerSaleId.toNumber() + 2);
            expect(rightBuyerSaleLevelCount.toNumber()).to.be.equal(leftBuyerSaleLevelCount.toNumber() + 2);
            expect(rightBuyerSaleLevelAmount.toNumber()).to.be.equal(leftBuyerSaleLevelAmount.add(amount).mul(2).toNumber());
            expect(rightBuyerSaleLevelId.toNumber()).to.be.equal(leftBuyerSaleLevelId.toNumber() + 2);
        })

        it("Sould be sent token from sender", async function() {
            await preparePayer1ToAllocate();
            const sale = 0;
            const level = 0;

            const balanceOfBefore = await usdcTest.balanceOf(payer1.address);
            const amount = ethers.BigNumber.from(25).mul(bn1e6);
            
            await ddaoAllocV01.connect(payer1).Allocate(sale, level, payer2.address, amount);
            
            const balanceOfAfter = await usdcTest.balanceOf(payer1.address);
            expect(balanceOfAfter.toNumber()).to.be.equal(balanceOfBefore.sub(amount).toNumber());
        })

        it("Should be participated in 3 levels of sale", async function() {
            await preparePayer1ToAllocate();
            const saleID = 0;
            await ddaoAllocV01Inst.SaleModify(saleID, 'Sale', 'DDAO Selling', payer3.address, 0);
            await ddaoAllocV01Inst.SaleDisable(saleID, false);

            const minAmountLevel1 = ethers.BigNumber.from(300).mul(bn1e6);
            const minAmountLevel2 = ethers.BigNumber.from(3000).mul(bn1e6);
            const minAmountLevel3 = ethers.BigNumber.from(5000).mul(bn1e6);

            await ddaoAllocV01.connect(payer1).Allocate(saleID, 1, payer1.address, minAmountLevel1);
            await ddaoAllocV01.connect(payer1).Allocate(saleID, 2, payer1.address, minAmountLevel2);
            await ddaoAllocV01.connect(payer1).Allocate(saleID, 3, payer1.address, minAmountLevel3);

            expect((await ddaoAllocV01.BuyerCount(payer1.address)).toNumber()).to.be.equal(3);
        })

        it("Sould be add event after sale", async function() {
            const sale = 0;
            const level = 0;
            const amount = ethers.BigNumber.from(25).mul(bn1e6);

            await ddaoAllocV01Inst.TokenAddrSet(usdcTest.address);
            await ddaoAllocV01Inst.LevelMinChange(0, 25);
            await ddaoAllocV01Inst.SaleModify(0, 'Sale', 'DDAO Selling', payer3.address, 0);
            await ddaoAllocV01Inst.SaleDisable(0, false);

            await usdcTest.approve(ddaoAllocV01Inst.address, amount);

            const tx = await ddaoAllocV01Inst.Allocate(sale, level, payer2.address, amount);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV01Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'EAllocate', (ev) => {
                return ev.payer === owner.address && ev.addr === payer2.address && ev.sale.toNumber() === sale && ev.level.toNumber() === level && ev.amount.toNumber() === amount.toNumber();
            });
        })
    })
})

