//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { DatalinkModeCode, DatalinkStatusCode } from '@datalink/common';
import { ATC } from '@flybywiresim/api-client';
import { FmgcFlightPhase } from '@shared/flightphase';
import { NXDataStore } from '@flybywiresim/fbw-sdk';
import { DatalinkConfiguration, DatalinkProviders, MaxSearchRange, OwnAircraft, VdlMaxDatarate } from './Common';

// worldwide international airports
// assumptions: international airports provide VHDL communication (i.e. USA)
// not perfectly realistic, but realistic enough for a frequency occupancy calculation
const VhfDatalinkAirports: string[] = [
    'DAUA', 'DAAG', 'DABB', 'DABT', 'DAAE', 'DAUB', 'DAOI', 'DABC', 'DAUH', 'DAAV', 'DAOO', 'DAAS', 'DAAT', 'DAON', 'HEBA', 'HEAT', 'HESN', 'HECA',
    'HEAR', 'HEAL', 'HEGN', 'HELX', 'HEMA', 'HEMM', 'HESC', 'HESH', 'HEMK', 'HETB', 'HLLB', 'HLLS', 'HLLT', 'HLLM', 'GMAD', 'GMMN', 'GMFF', 'GMMX',
    'GMMW', 'GMFO', 'GMME', 'GMTT', 'GMTN', 'GMMH', 'GMML', 'HSSS', 'HSPN', 'DTTJ', 'DTNH', 'DTMB', 'DTTX', 'DTKA', 'DTTZ', 'DTTA', 'HBBA', 'FMCH',
    'HFFF', 'HHAS', 'HAAB', 'HADR', 'HKED', 'HKMO', 'HKKI', 'HKJK', 'FMMI', 'FMNA', 'FMNM', 'FMNN', 'FMMT', 'FMSD', 'FMST', 'FWCL', 'FWLI', 'FIMP',
    'FMCZ', 'FQMA', 'FQBR', 'FQIN', 'FQNP', 'FQPB', 'FQTT', 'FQVL', 'FMEE', 'HRYR', 'FSIA', 'HCMF', 'HCMH', 'HCMK', 'HCMM', 'HSSJ', 'HTAR', 'HTDA',
    'HTKJ', 'HTMW', 'HTZA', 'HUAR', 'HUEN', 'HUGU', 'FLLI', 'FLLS', 'FLND', 'FVHA', 'FVFA', 'FVBU', 'FNLU', 'FNUB', 'FKKD', 'FKYS', 'FEFF', 'FTTJ',
    'FZNA', 'FZAA', 'FZIC', 'FZQA', 'FCBB', 'FCPP', 'FGSL', 'FOON', 'FOOL', 'FOOG', 'FPST', 'DBBB', 'RKND', 'FXMM', 'FYWH', 'FYWB', 'FACT', 'FADN',
    'FAJS', 'FAKN', 'FABL', 'FAEL', 'FBSK', 'FBMN', 'FBFT', 'FBKE', 'DFOO', 'DFFD', 'GVBA', 'GVAC', 'GVFM', 'GVSV', 'DIAP', 'GBYD', 'DGAA', 'DGSI',
    'DGTK', 'DGSN', 'DGLW', 'DGLE', 'GUCY', 'GGOV', 'GGBU', 'GLRB', 'GABS', 'GQNN', 'GQPP', 'DRRN', 'DNAA', 'DNCA', 'DNAS', 'DNKN', 'DNMM', 'DNPO',
    'DNEN', 'DNSO', 'FHSH', 'GOBD', 'GFLL', 'DXXX', 'TQPF', 'TAPA', 'TNCA', 'MYNN', 'MYBC', 'MYEF', 'MYGF', 'MYER', 'TBPB', 'TUPJ', 'TNCB', 'TNCE',
    'TNCS', 'MWCB', 'MWCR', 'MUCM', 'MUOC', 'MUCL', 'MUCF', 'MUHA', 'MUHG', 'MUSC', 'MUCU', 'MUVR', 'TNCC', 'TDPD', 'MDBH', 'MDLR', 'MDPC', 'MDCY',
    'MDPP', 'MDST', 'MDSD', 'TGPY', 'TFFR', 'MTCH', 'MTPP', 'MKJP', 'MKJS', 'TFFF', 'TRPG', 'TJBQ', 'TJSJ', 'TFFJ', 'TKPK', 'TLPL', 'TVSV', 'TVSC',
    'TNCM', 'TTPP', 'TTCP', 'MBPV', 'TIST', 'TISX', 'MZBZ', 'MRLB', 'MROC', 'MSLP', 'MGTK', 'MGGT', 'MHLC', 'MHRO', 'MHLM', 'MHTG', 'MNMG', 'MNBL',
    'MNCI', 'MPBO', 'MPDA', 'MPTO', 'TXKF', 'CYXX', 'CYYC', 'CYEG', 'CYFC', 'CYQX', 'CYHZ', 'CYHM', 'CYLW', 'CYXU', 'CYQM', 'CYUL', 'CYOW', 'CYQB',
    'CYQR', 'CYXE', 'CYYT', 'CYQT', 'CYYZ', 'CYVR', 'CYYJ', 'CYXY', 'CYHA', 'CYWG', 'BGSF', 'BGGH', 'BGJN', 'BGBW', 'MMAA', 'MMAS', 'MMUN', 'MMCU',
    'MMCE', 'MMCZ', 'MMCL', 'MMDO', 'MMGL', 'MMHO', 'MMBT', 'MMZH', 'MMLO', 'MMLT', 'MMSD', 'MMZO', 'MMMZ', 'MMMD', 'MMMX', 'MMMY', 'MMMM', 'MMOX',
    'MMPB', 'MMPR', 'MMQT', 'MMRX', 'MMIO', 'MMSP', 'MMTM', 'MMTJ', 'MMTO', 'MMTC', 'MMTG', 'MMPN', 'MMVR', 'MMVA', 'MMZC', 'LFVP', 'KAKR', 'KALB',
    'KABQ', 'PANC', 'KATW', 'KATL', 'KACY', 'KAUS', 'KBWI', 'KBGR', 'KBLI', 'KBHM', 'KBOI', 'KBOS', 'KBUF', 'KCLT', 'KCHS', 'KMDW', 'KCVG', 'KCLE',
    'KCMH', 'KDFW', 'KDAY', 'KDEN', 'KDSM', 'KDTW', 'KELP', 'PAFA', 'KFLL', 'KRSW', 'KFAT', 'KGRR', 'KGRB', 'KGSO', 'KMDT', 'KBDL', 'PHTO', 'PHNL',
    'KIAH', 'KHSV', 'KIND', 'KJAN', 'KJAX', 'PAJN', 'KMCI', 'PAKT', 'KEYW', 'PHKO', 'KTYS', 'KLAL', 'KLAN', 'KLAS', 'KLIT', 'KLAX', 'KSDF', 'KMLB',
    'KMEM', 'KMIA', 'KMAF', 'KMKE', 'KMSP', 'KMYR', 'KBNA', 'KMSY', 'KJFK', 'KEWR', 'KSWF', 'KORF', 'KOAK', 'KOKC', 'KOMA', 'KONT', 'KSNA', 'KMCO',
    'KSFB', 'KPSP', 'KECP', 'KPNS', 'KPHL', 'KPHX', 'KIWA', 'KPIT', 'KPWM', 'KPDX', 'KPVD', 'KRAC', 'KRDU', 'KRNO', 'KRIC', 'KRST', 'KROC', 'KRFD',
    'KSMF', 'KSLC', 'KSAT', 'KSBD', 'KSAN', 'KSFO', 'KSJC', 'KSRQ', 'KSAV', 'KSBM', 'KPAE', 'KGEG', 'KSTL', 'KPIE', 'KSYR', 'KTLH', 'KTPA', 'KTUS',
    'KTUL', 'KDCA', 'KPBI', 'KAVP', 'KILM', 'SAEZ', 'SAZS', 'SACO', 'SAME', 'SARI', 'SARE', 'SAWG', 'SAWH', 'SLLP', 'SLVR', 'SLCB', 'SBAR', 'SBBE',
    'SBCF', 'SBBV', 'SBBR', 'SBKP', 'SBCG', 'SBCY', 'SBCT', 'SBFL', 'SBFZ', 'SBFI', 'SBGO', 'SBJP', 'SBMO', 'SBEG', 'SBNT', 'SBPL', 'SBPA', 'SBPV',
    'SBRF', 'SBRB', 'SBGL', 'SBSV', 'SBSL', 'SBSP', 'SBTE', 'SBUL', 'SBVT', 'SCFA', 'SCIE', 'SCTE', 'SCCI', 'SCEL', 'SKAR', 'SKBQ', 'SKBO', 'SKBG',
    'SKBU', 'SKCL', 'SKCG', 'SKCC', 'SKIB', 'SKIP', 'SKFL', 'SKLT', 'SKAO', 'SKMZ', 'SKRG', 'SKMU', 'SKMR', 'SKNV', 'SKPS', 'SKPE', 'SKPP', 'SKPV',
    'SKUI', 'SKRH', 'SKSP', 'SKTL', 'SKCO', 'SKSM', 'SKCZ', 'SKVP', 'SKVV', 'SKYP', 'SECU', 'SETN', 'SEGU', 'SERO', 'SEMT', 'SEQU', 'SETU', 'EGYP',
    'SOCA', 'SYCJ', 'SGAS', 'SGES', 'SPQU', 'SPZO', 'SPIM', 'SMJP', 'SUMU', 'SULS', 'SURV', 'SVMI', 'SVMC', 'SVVA', 'UATE', 'UATT', 'UAAA', 'UATG',
    'UAKK', 'UACK', 'UAUU', 'UAOO', 'UACC', 'UARR', 'UASK', 'UASP', 'UACP', 'UASS', 'UAII', 'UADD', 'UAFM', 'UCFL', 'UAFO', 'UTDT', 'UTDD', 'UTDL',
    'UTDK', 'UTAA', 'UTAT', 'UTAM', 'UTAK', 'UTAV', 'UTFA', 'UTSB', 'UTKF', 'UTSL', 'UTFN', 'UTSA', 'UTNN', 'UTSS', 'UTTT', 'UTST', 'UTNU', 'ZKPY',
    'RJSK', 'RJSA', 'RJFF', 'RJCH', 'RJFK', 'RJNK', 'RJOA', 'RJFR', 'RJFU', 'ROAH', 'RJGG', 'RJSN', 'RJFO', 'RJOB', 'RJBB', 'RJCC', 'RJSS', 'RJNS',
    'RJTT', 'RJAA', 'ZMUB', 'ZBOW', 'ZGBH', 'ZBAA', 'ZYCC', 'ZGHA', 'ZSCG', 'ZUUU', 'ZUCK', 'ZYTL', 'ZYDD', 'ZBDT', 'ZLDH', 'ZHES', 'ZSFZ', 'ZSGZ',
    'ZGGG', 'ZGKL', 'ZUGY', 'ZJHK', 'ZSHC', 'ZYHB', 'ZSOF', 'ZYHE', 'ZBHH', 'ZSSH', 'ZSTX', 'ZBLA', 'ZYJM', 'ZGOW', 'ZSJN', 'ZPPP', 'ZLAN', 'ZULS',
    'ZSLG', 'ZPLJ', 'ZSLY', 'ZHLY', 'ZPMS', 'ZBMZ', 'ZGMX', 'ZYMD', 'ZSCN', 'ZSNJ', 'ZGNN', 'ZSNT', 'ZSNB', 'ZBDS', 'ZSQD', 'ZBDH', 'ZYQQ', 'ZSQZ',
    'ZGSY', 'ZSSS', 'ZYTX', 'ZGSZ', 'ZBSJ', 'ZBYN', 'ZBTJ', 'ZWWW', 'ZUWX', 'ZSWH', 'ZSWZ', 'ZHHH', 'ZSWX', 'ZSWY', 'ZSAM', 'ZLXY', 'ZLXN', 'ZBXZ',
    'ZPJH', 'ZSXZ', 'ZSYN', 'ZSYA', 'ZYYJ', 'ZSYT', 'ZHYC', 'ZLIC', 'ZSYW', 'ZBYC', 'ZGDY', 'ZGZJ', 'ZHCC', 'ZGSD', 'ZUZY', 'VHHH', 'VMMC', 'RCYU',
    'RCKH', 'RCMQ', 'RCNN', 'RCSS', 'RCTP', 'RKPK', 'RKTN', 'RKPC', 'RKSS', 'RKSI', 'RKTU', 'RKJB', 'RKNY', 'VGEG', 'VGHS', 'VGSY', 'VQPR', 'VEAT',
    'VAAH', 'VIAR', 'VOBG', 'VEBS', 'VOMM', 'VOCB', 'VIDP', 'VAGO', 'VEGY', 'VEGT', 'VOHY', 'VEIM', 'VAID', 'VIJP', 'UELL', 'VOCI', 'VECC', 'VOCL',
    'VILK', 'VOMD', 'VOML', 'VABB', 'VANP', 'VAPO', 'VEBD', 'VISR', 'VASU', 'VOTV', 'VOTR', 'VABO', 'VIBN', 'VOBZ', 'VEVZ', 'VRMM', 'VRMG', 'VRMH',
    'VNKT', 'OPBW', 'OPFA', 'OPGD', 'OPRN', 'OPKC', 'OPLA', 'OPMT', 'OPPS', 'OPQT', 'OPRK', 'OPST', 'OPTU', 'VCBI', 'VCRI', 'VCCJ', 'WBSB', 'VDPP',
    'VDSR', 'VDSV', 'WPDL', 'WALL', 'WITT', 'WIIT', 'WIIB', 'WRBB', 'WADY', 'WIKB', 'WABB', 'WADD', 'WIIH', 'WRKK', 'WAAA', 'WAMM', 'WADL', 'WIMM',
    'WIPT', 'WIPP', 'WIBB', 'WIOO', 'WIIS', 'WIMN', 'WRSJ', 'WRSQ', 'WIKD', 'WRLR', 'WAHI', 'VLLB', 'VLPS', 'VLSK', 'VLVT', 'WMKA', 'WMKI', 'WMKJ',
    'WMKC', 'WBKK', 'WMKK', 'WMKN', 'WMKD', 'WBGG', 'WMKL', 'WMKP', 'WMSA', 'VYCZ', 'VYYY', 'VYNT', 'RPUO', 'RPLH', 'RPVM', 'RPLC', 'RPMD', 'RPMR',
    'RPVI', 'RPVK', 'RPLI', 'RPLL', 'RPVT', 'RPVP', 'RPLB', 'RPMZ', 'WSSS', 'VTBD', 'VTBD', 'VTCC', 'VTCT', 'VTUD', 'VTSS', 'VTSG', 'VTSP', 'VTSB',
    'VTSM', 'VTUD', 'VVDN', 'VVNB', 'VVTS', 'VVCT', 'VVCI', 'VVPB', 'VVPQ', 'VVCR', 'VVCA', 'OAKB', 'OAHR', 'OAKN', 'OAMS', 'OBBI', 'OIAA', 'OIAW',
    'OIHR', 'OITL', 'OIBP', 'OIKB', 'OIMB', 'OIBB', 'OING', 'OIHH', 'OICI', 'OIFM', 'OIKK', 'OICC', 'OIBK', 'OIZC', 'OISR', 'OISL', 'OIMM', 'OIKQ',
    'OIGG', 'OINZ', 'OISS', 'OITT', 'OIIE', 'OITR', 'OIYY', 'OIZH', 'ORNI', 'ORBI', 'ORMM', 'ORER', 'ORBM', 'ORTL', 'ORSU', 'LLER', 'LLHA', 'LLBG',
    'OJAQ', 'OJAI', 'OKBK', 'OLBA', 'OOMS', 'OOSA', 'OOSH', 'OTBD', 'OEAB', 'OEAH', 'OESK', 'OEGS', 'OEDF', 'OEHL', 'OEJN', 'OEGN', 'OEMA', 'OENG',
    'OERK', 'OETB', 'OETF', 'OEYN', 'OSAP', 'OSDI', 'OSLK', 'OSKL', 'OMAA', 'OMAL', 'OMDW', 'OMRK', 'OMSJ', 'OYAA', 'OYSN', 'OYSY', 'EBAW', 'EBBR',
    'EBCI', 'EBLG', 'EBOS', 'LFKJ', 'LFKB', 'LFOB', 'LFBE', 'LFMU', 'LFBZ', 'LFBD', 'LFRB', 'LFMK', 'LFOK', 'LFLB', 'LFRD', 'LFKF', 'LFLS', 'LFBH',
    'LFQQ', 'LFBL', 'LFLL', 'LFML', 'LFSB', 'LFRS', 'LFMN', 'LFTW', 'LFPG', 'LFBP', 'LFMP', 'LFBI', 'LFCR', 'LFMH', 'LFST', 'LFTH', 'LFBO', 'LFOT',
    'LXGB', 'EGJA', 'EGJB', 'EGJJ', 'EICK', 'EIDW', 'EIKY', 'EIKN', 'EINN', 'EGNS', 'ELLX', 'EHAM', 'EHEH', 'EHGG', 'EHBK', 'EHRD', 'LOWG', 'LOWK',
    'LOWI', 'LOWL', 'LOWS', 'LOWW', 'LKTB', 'LKKV', 'LKMT', 'LKPR', 'LKPD', 'EDSB', 'EDDB', 'EDDW', 'EDDK', 'EDLW', 'EDDL', 'EDDF', 'EDNY', 'EDDH',
    'EDDV', 'EDDP', 'EDHL', 'EDJA', 'EDDM', 'EDDN', 'EDDS', 'EDLV', 'LHBP', 'LHDC', 'LHSM', 'LHPR', 'LZIB', 'LZKZ', 'LZPP', 'LZTT', 'LZSL', 'LZZI',
    'LFSB', 'LSZB', 'LSGG', 'LSZA', 'LSZR', 'LSZH', 'EPBY', 'EPGD', 'EPKT', 'EPKK', 'EPLB', 'EPLL', 'EPPO', 'EPRZ', 'EPSC', 'EPWA', 'EPWR', 'LDSB',
    'LDDU', 'LDLO', 'LDOS', 'LDPL', 'LDRI', 'LDSP', 'LDZD', 'LDZA', 'LCLK', 'LCPH', 'LCEN', 'LGAV', 'LGKF', 'LGSA', 'LGHI', 'LGKR', 'LGIR', 'LGKL',
    'LGKP', 'LGKV', 'LGKO', 'LGMK', 'LGMT', 'LGPZ', 'LGRP', 'LGSM', 'LGSR', 'LGSK', 'LGSY', 'LGTS', 'LGBL', 'LGZA', 'LIEA', 'LIPY', 'LIBD', 'LIME',
    'LIPE', 'LIPO', 'LIBR', 'LIEE', 'LICC', 'LIMZ', 'LIRQ', 'LIMJ', 'LICA', 'LIML', 'LIRN', 'LIEO', 'LICJ', 'LIMP', 'LIRZ', 'LIBP', 'LIRP', 'LIPR',
    'LIRF', 'LICT', 'LIPQ', 'LIMF', 'LIPZ', 'LIPX', 'LMML', 'LPBJ', 'LPFR', 'LPMA', 'LPPS', 'LPPT', 'LPPR', 'LPPD', 'LPLA', 'LJLJ', 'LJMB', 'LJPZ',
    'LECO', 'LEAL', 'LEAM', 'LEAS', 'LEBL', 'LEBB', 'LECS', 'GCFV', 'LEGE', 'GCLP', 'LEGR', 'LEHC', 'LEIB', 'LEJR', 'GCLA', 'GCRR', 'LEDA', 'LEMD',
    'LEMG', 'LEMH', 'LEMI', 'LEPA', 'LEPP', 'LERS', 'LEXJ', 'LEST', 'LEZL', 'GCXO', 'LEVC', 'LEVD', 'LEVX', 'LEVT', 'LEZG', 'LATI', 'LAKU', 'UGEE',
    'UDSG', 'UBBB', 'UBBG', 'UBBN', 'UBBQ', 'UBBL', 'UBBY', 'UMMG', 'UMGG', 'UMMS', 'LQBK', 'LQSA', 'LQTZ', 'LQMO', 'LBBG', 'LBPD', 'LBSF', 'LBWN',
    'EETN', 'EETU', 'UGSB', 'UGKO', 'UGSS', 'UGGG', 'LYPR', 'EVRA', 'EVVA', 'EYKA', 'EYPA', 'EYSA', 'EYVI', 'LUKK', 'LRAR', 'LRBC', 'LRBM', 'LROP',
    'LRCL', 'LRCK', 'LRCV', 'LRIA', 'LROD', 'LRSM', 'LRSB', 'LRSV', 'LRTM', 'LRTR', 'LYPG', 'LYTV', 'LWOH', 'LWSK', 'UNAA', 'UHMA', 'URKA', 'ULAA',
    'URWA', 'UNBB', 'UUOB', 'UHBB', 'UIBB', 'UUBP', 'UWKS', 'USCC', 'ULWC', 'UIAA', 'URWI', 'UUII', 'URMG', 'UMKK', 'UWKD', 'UHHH', 'UHKK', 'URKK',
    'UNKL', 'UUOK', 'UHMM', 'USCM', 'URML', 'URMM', 'UUDD', 'ULMM', 'URMN', 'USNN', 'UWKE', 'UWGG', 'UNWW', 'UNNT', 'UNOO', 'UWOO', 'UWOR', 'USPP',
    'ULPB', 'UHMD', 'UHPP', 'ULOO', 'URRR', 'ULLI', 'UWWW', 'URSS', 'URMT', 'USRR', 'UUYY', 'UNTT', 'USTR', 'UIUU', 'UWLL', 'UWUU', 'UHWW', 'URMO',
    'URWW', 'UUOO', 'UEEE', 'UUDL', 'USSS', 'UHSS', 'LYBE', 'LYNI', 'LYKV', 'LTAF', 'LTFG', 'LTAC', 'LTAI', 'LTFE', 'LTBR', 'LTBS', 'LTAY', 'LTCC',
    'LTCA', 'LTAJ', 'LTBA', 'LTBJ', 'LTAU', 'LTAN', 'LTBZ', 'LTAT', 'LTAZ', 'LTFH', 'LTCG', 'LTAS', 'UKLN', 'UKDD', 'UKLI', 'UKHH', 'UKDR', 'UKBB',
    'UKLL', 'UKON', 'UKOO', 'UKHP', 'UKFF', 'UKLU', 'UKDE', 'EKYT', 'EKAH', 'EKBI', 'EKCH', 'EKVG', 'EFMA', 'EFHK', 'EFKT', 'EFKU', 'EFKS', 'EFLP',
    'EFOU', 'EFRO', 'EFTP', 'EFTU', 'EFVA', 'BIAR', 'BIKF', 'ENAL', 'ENBR', 'ENBO', 'ENHD', 'ENCN', 'ENGM', 'ENZV', 'ENTC', 'ENVA', 'ESGG', 'ESPA',
    'ESMS', 'ESSP', 'ESPC', 'ESSA', 'ESNN', 'ESNU', 'ESMX', 'ESSV', 'EGBB', 'EGHH', 'EGGD', 'EGFF', 'EGCN', 'EGNV', 'EGNX', 'EGTE', 'EGNM', 'EGGP',
    'EGLC', 'EGCC', 'EGNT', 'EGDQ', 'EGSH', 'EGHI', 'EGPD', 'EGPH', 'EGPF', 'EGPE', 'EGAA', 'EGAE', 'NSTU', 'YPAD', 'YBBN', 'YBRM', 'YBCS', 'YSCB',
    'YPDN', 'YAVV', 'YBCG', 'YMHB', 'YMML', 'YWLM', 'YPPH', 'YPPD', 'YBMC', 'YSSY', 'YBTL', 'YPXM', 'YPCC', 'NCRG', 'SCIP', 'NFFN', 'NFNA', 'NTAA',
    'PGUM', 'PLCH', 'NGTA', 'PKWA', 'PKMJ', 'PTKK', 'PTSA', 'PTPN', 'PTYA', 'ANAU', 'NWWW', 'NZAA', 'NZCH', 'NZQN', 'NZWN', 'YSNF', 'PGRO', 'PGSN',
    'PGWT', 'NIUE', 'PTRO', 'AYPY', 'AYMH', 'NSFA', 'AGGH', 'NFTF', 'NFTV', 'NGFU', 'NVSS', 'NVVV', 'NLWF', 'NLWW'];

// filter parameters to find preselect conditional relevant stations
const MaxAirportsInRange = 50;

// physical parameters to simulate the signal quality
const AdditiveNoiseOverlapDB = 1.4;
const MaximumDampingDB = -75.0;
const ReceiverAntennaGainDBI = 25.0;
// is equal to 50W emitter power
const SignalStrengthDBW = 39.1202;

class Airport {
    public Icao = '';

    public Elevation = 0.0;

    public Distance = 0.0;

    public Datarates: [ boolean, number ][] = Array(DatalinkProviders.ProviderCount).fill([false, 0]);
}

/*
 * Simulates the physical effects of the VHF communication
 * - All international airports in a LoS range are taken into account
 * - The SNR is simulated and the resulting datarate is defined per airport
 */
export class Vhf {
    public stationsUpperAirspace: number = 0;

    public datarates: number[] = [];

    private presentPosition: OwnAircraft = new OwnAircraft();

    private frequencyOverlap: number[] = [];

    public relevantAirports: Airport[] = [];

    public datalinkStatus: DatalinkStatusCode = DatalinkStatusCode.Inop;

    public datalinkMode: DatalinkModeCode = DatalinkModeCode.None;

    private updatePresentPosition() {
        this.presentPosition.Latitude = SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude');
        this.presentPosition.Longitude = SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude');
        this.presentPosition.Altitude = SimVar.GetSimVarValue('PLANE ALTITUDE', 'feet');
        this.presentPosition.AltitudeAboveGround = SimVar.GetSimVarValue('PLANE ALT ABOVE GROUND', 'feet');
        this.presentPosition.PressureAltitude = SimVar.GetSimVarValue('INDICATED ALTITUDE:3', 'feet');
    }

    // calculates the freespace path loss for a certain distance
    // reference: https://en.wikipedia.org/wiki/Free-space_path_loss
    private freespacePathLoss(frequency: number, distance: number): number {
        // convert to meters
        const meters = distance * 1852;
        return 10.0 * Math.log10((4.0 * Math.PI * meters * (frequency * 1000000) / 299792458) ** 2.0);
    }

    private estimateDatarate(type: DatalinkProviders, distance: number, flightPhase: FmgcFlightPhase, airport: Airport): void {
        const maximumFreespaceLoss = SignalStrengthDBW + ReceiverAntennaGainDBI - AdditiveNoiseOverlapDB * (this.frequencyOverlap[type]) - MaximumDampingDB;
        let freespaceLoss = this.freespacePathLoss(DatalinkConfiguration[type], distance);

        // simulate the influence of buildings
        if (flightPhase === FmgcFlightPhase.Preflight || flightPhase === FmgcFlightPhase.Done) {
            // assume that buildings are close the aircraft -> add a loss of 30 dB to simulate the influence of buildings
            freespaceLoss += 30;
        } else if (flightPhase === FmgcFlightPhase.Takeoff || flightPhase === FmgcFlightPhase.GoAround || flightPhase === FmgcFlightPhase.Approach) {
            // assume that high buildings are in the vicinity of the aircraft -> add a loss of 15 dB to simulate the influence of buildings
            freespaceLoss += 15;
        }

        if (maximumFreespaceLoss >= freespaceLoss) {
            const lossDelta = maximumFreespaceLoss - freespaceLoss;

            // get the quality ratio normalized by the simulated signal power range
            const qualityRatio = Math.min(1.0, lossDelta / Math.abs(MaximumDampingDB));

            // use a sigmoid function to estimate the scaling of the datarate
            // parametrized to jump from 1.0 to 0.02 (y) between 0.0 and 1.0 (x)
            // minimum scaling is 10% of the optimal datarate
            // inverse of quality ratio is needed to estimate the quality loss
            const scaling = Math.max(0.1, 1.0 / (Math.exp(9.0 * (1.0 - qualityRatio) - 5.0) + 1.0));

            airport.Datarates[type][0] = true;
            airport.Datarates[type][1] = VdlMaxDatarate * scaling;
        }
    }

    private async updateRelevantAirports(flightPhase: FmgcFlightPhase): Promise<void> {
        // use a simple line of sight algorithm to calculate the maximum distance
        // it ignores the topolography, but simulates the earth curvature
        // reference: https://audio.vatsim.net/storage/AFV%20User%20Guide.pdf
        const maximumDistanceLoS = (altitude0: number, altitude1: number): number => 1.23 * Math.sqrt(Math.abs(altitude0 - altitude1));

        this.stationsUpperAirspace = 0;
        this.relevantAirports = [];

        // prepare the request with the information
        const requestBatch = new SimVar.SimVarBatch('C:fs9gps:NearestAirportItemsNumber', 'C:fs9gps:NearestAirportCurrentLine');
        requestBatch.add('C:fs9gps:NearestAirportCurrentICAO', 'string', 'string');
        requestBatch.add('C:fs9gps:NearestAirportSelectedLatitude', 'degree latitude');
        requestBatch.add('C:fs9gps:NearestAirportSelectedLongitude', 'degree longitude');
        requestBatch.add('C:fs9gps:WaypointAirportElevation', 'feet');
        requestBatch.add('C:fs9gps:NearestAirportCurrentDistance', 'meters');

        SimVar.SetSimVarValue('C:fs9gps:NearestAirportCurrentLatitude', 'degree latitude', this.presentPosition.Latitude);
        SimVar.SetSimVarValue('C:fs9gps:NearestAirportCurrentLongitude', 'degree longitude', this.presentPosition.Longitude);
        SimVar.SetSimVarValue('C:fs9gps:NearestAirportMaximumItems', 'number', MaxAirportsInRange);
        SimVar.SetSimVarValue('C:fs9gps:NearestAirportMaximumDistance', 'nautical miles', 100000);

        // get all airports
        return new Promise((resolve) => {
            SimVar.GetSimVarArrayValues(requestBatch, (airports: any[]) => {
                airports.forEach((fetched) => {
                    // format: 'TYPE(one char) ICAO '
                    const icao = fetched[0].substr(2).trim();

                    // found an international airport
                    if (VhfDatalinkAirports.findIndex((elem) => elem === icao) !== -1) {
                        const maxDistance = maximumDistanceLoS(this.presentPosition.PressureAltitude, fetched[3]);
                        const distanceNM = fetched[4] * 0.000539957;

                        if (distanceNM <= maxDistance) {
                            const airport = new Airport();
                            airport.Icao = icao;
                            airport.Elevation = fetched[3];
                            airport.Distance = distanceNM;

                            let validAirport = false;
                            for (let i = 0; i < DatalinkProviders.ProviderCount; ++i) {
                                this.estimateDatarate(i as DatalinkProviders, distanceNM, flightPhase, airport);
                                validAirport = validAirport || airport.Datarates[i as DatalinkProviders][0];
                            }

                            if (validAirport) {
                                this.relevantAirports.push(airport);
                            }
                        }

                        // assume that all upper stations are reachable within the maximum range
                        if (distanceNM <= MaxSearchRange) {
                            this.stationsUpperAirspace += 1;
                        }
                    }
                });

                resolve();
            });
        });
    }

    private greatCircleDistance(latitude: number, longitude: number): number {
        const deg2rad = (deg) => deg * (Math.PI / 180);

        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(this.presentPosition.Latitude - latitude); // deg2rad below
        const dLon = deg2rad(this.presentPosition.Longitude - longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
              + Math.cos(deg2rad(latitude)) * Math.cos(deg2rad(this.presentPosition.Latitude))
              * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 0.5399568; // Distance in nm

        return d;
    }

    private async updateUsedVoiceFrequencies(): Promise<void> {
        const storedAtisSrc = NXDataStore.get('CONFIG_ATIS_SRC', 'FAA').toLowerCase();
        this.frequencyOverlap = Array(DatalinkProviders.ProviderCount).fill(0);

        if (storedAtisSrc === 'vatsim' || storedAtisSrc === 'ivao') {
            await ATC.get(storedAtisSrc).then((res) => {
                if (!res) return;

                res = res.filter((a) => a.callsign.indexOf('_OBS') === -1 && parseFloat(a.frequency) <= 136.975 && this.greatCircleDistance(a.latitude, a.longitude) <= MaxSearchRange);
                res.forEach((controller) => {
                    const frequency = parseFloat(controller.frequency);

                    for (const key in DatalinkConfiguration) {
                        if ({}.hasOwnProperty.call(DatalinkConfiguration, key)) {
                            const datalinkFrequency = DatalinkConfiguration[key];

                            if (frequency >= datalinkFrequency - 0.009 && frequency <= datalinkFrequency + 0.009) {
                            // check 8.33 kHz spacing
                                this.frequencyOverlap[key] += 1;
                            } else if (frequency >= datalinkFrequency - 0.025 && frequency <= datalinkFrequency + 0.025) {
                            // check the direct 25 kHz neighbors for SITA
                                this.frequencyOverlap[key] += 1;
                            }
                        }
                    }
                });
            });
        }
    }

    /**
     * Simulates the data rates for the different datalink providers
     * @param flightPhase Actual flight phase to simulate the building based interferences
     * @returns A promise to provide the possibilty to run it in sequence
     */
    public async simulateDatarates(flightPhase: FmgcFlightPhase): Promise<void> {
        this.updatePresentPosition();

        return this.updateUsedVoiceFrequencies().then(() => this.updateRelevantAirports(flightPhase).then(() => {
            // use the average over all reachable stations to estimate the datarate
            this.datarates = Array(DatalinkProviders.ProviderCount).fill(0.0);
            const stationCount = Array(DatalinkProviders.ProviderCount).fill(0);

            this.relevantAirports.forEach((airport) => {
                for (let i = 0; i < DatalinkProviders.ProviderCount; ++i) {
                    if (airport.Datarates[0]) {
                        this.datarates[i] += airport.Datarates[i][1];
                        stationCount[i] += 1;
                    }
                }
            });

            for (let i = 0; i < DatalinkProviders.ProviderCount; ++i) {
                if (stationCount[i] !== 0) this.datarates[i] /= stationCount[i];
            }
        }));
    }

    public updateDatalinkStates(interfacePowered: boolean, datalinkMode: boolean) {
        if (!interfacePowered) {
            this.datalinkStatus = DatalinkStatusCode.Inop;
            this.datalinkMode = DatalinkModeCode.None;
        } else if (!datalinkMode) {
            this.datalinkStatus = DatalinkStatusCode.DlkNotAvail;
            this.datalinkMode = DatalinkModeCode.None;
        } else {
            this.datalinkStatus = DatalinkStatusCode.DlkAvail;
            if (SimVar.GetSimVarValue('L:A32NX_HOPPIE_ACTIVE', 'number') === 1) {
                this.datalinkMode = DatalinkModeCode.AtcAoc;
            }
            this.datalinkMode = DatalinkModeCode.Aoc;
        }
    }
}
