/**
 * Copyright (c) 2023, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef } from 'react';
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { IntlProvider } from 'react-intl';
import { DEFAULT_INTL_CONFIG } from 'react-intl/src/utils';
import { GeoData, type MapEquipment, MapEquipments, NetworkMap, type NetworkMapRef } from '../../src';

import { addNadToDemo, addSldToDemo } from './diagram-viewers/add-diagrams';
import sposdata from './map-viewer/data/spos.json';
import lposdata from './map-viewer/data/lpos.json';
import smapdata from './map-viewer/data/smap.json';
import lmapdata from './map-viewer/data/lmap.json';

export default function App() {
    const INITIAL_ZOOM = 9;
    const LABELS_ZOOM_THRESHOLD = 9;
    const ARROWS_ZOOM_THRESHOLD = 7;
    const useName = true;

    useEffect(() => {
        addNadToDemo();
        addSldToDemo();
    }, []);

    //called after a click (right mouse click) on an equipment (line or substation)
    function showEquipmentMenu(equipment: MapEquipment, x: number, y: number, type: string) {
        console.log('# Show equipment menu: ' + JSON.stringify(equipment) + ', type: ' + type);
    }

    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
        },
    });

    //declare data to be displayed: coordinates and network data
    const geoData = new GeoData(new Map(), new Map());
    geoData.setSubstationPositions(sposdata);
    geoData.setLinePositions(lposdata);

    const mapEquipments = new MapEquipments();
    mapEquipments.updateSubstations(smapdata, true);
    mapEquipments.updateLines(lmapdata, true);

    useEffect(() => {
        const handleContextmenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextmenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextmenu);
        };
    }, []);

    const networkMapRef = useRef<NetworkMapRef>(null);
    const filteredNominalVoltages = [380.0, 225.0, 110.0];

    return (
        <div className="App">
            <header className="App-header"></header>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={darkTheme}>
                    {/* repeat locale here just to avoid typescript errors and the following error logs in the console
                     Error: [@formatjs/intl Error INVALID_CONFIG] "locale" was not configured, using "en" as fallback */}
                    <IntlProvider locale={DEFAULT_INTL_CONFIG.defaultLocale}>
                        <div
                            style={{
                                position: 'relative',
                                width: 1000,
                                height: 1000,
                            }}
                        >
                            <NetworkMap
                                ref={networkMapRef}
                                mapEquipments={mapEquipments}
                                geoData={geoData}
                                labelsZoomThreshold={LABELS_ZOOM_THRESHOLD}
                                arrowsZoomThreshold={ARROWS_ZOOM_THRESHOLD}
                                initialZoom={INITIAL_ZOOM}
                                useName={useName}
                                onSubstationClick={(vlId) => {
                                    console.log('# OpenVoltageLevel: ' + vlId);
                                }}
                                onSubstationClickChooseVoltageLevel={(idSubstation, x, y) =>
                                    console.log(
                                        `# Choose Voltage Level for substation: ${idSubstation}  at coordinates (${x}, ${y})`
                                    )
                                }
                                onSubstationMenuClick={(equipment, x, y) =>
                                    showEquipmentMenu(equipment, x, y, 'substation')
                                }
                                onLineMenuClick={(equipment, x, y) => showEquipmentMenu(equipment, x, y, 'line')}
                                onVoltageLevelMenuClick={(equipment, x, y) => {
                                    console.log(
                                        `# VoltageLevel menu click: ${JSON.stringify(
                                            equipment
                                        )} at coordinates (${x}, ${y})`
                                    );
                                }}
                                mapLibrary={'cartonolabel'}
                                mapTheme={'dark'}
                                filteredNominalVoltages={filteredNominalVoltages}
                                onDrawPolygonModeActive={(active) => {
                                    console.log('polygon drawing mode active: ', active ? 'active' : 'inactive');
                                }}
                                onPolygonChanged={() => {
                                    console.log(
                                        'Selected Substations: ',
                                        networkMapRef.current?.getSelectedSubstations().length
                                    );
                                    console.log('Selected Lines: ', networkMapRef.current?.getSelectedLines().length);
                                }}
                                renderPopover={(lineId) => {
                                    return (
                                        <div
                                            style={{
                                                display: 'block',
                                                color: 'black',
                                                backgroundColor: 'white',
                                                padding: '15px',
                                                fontSize: '16px',
                                            }}
                                        >
                                            <div>LINE id: {lineId}</div>
                                        </div>
                                    );
                                }}
                            />
                            <button onClick={() => networkMapRef.current?.resetZoomAndPosition()}>
                                Reset zoom and position
                            </button>
                        </div>
                    </IntlProvider>
                </ThemeProvider>
            </StyledEngineProvider>
        </div>
    );
}
