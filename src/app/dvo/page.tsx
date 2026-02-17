
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { AutoApproveSettings } from "@/components/gamification/AutoApproveSettings";

// Mock Data Types
type ValuationSignal = {
    id: number;
    symbol: string;
    current_price: number;
    fair_value_price: number;
    margin_of_safety_pct: number;
    regime_tag: string;
    confidence_score: number;
};

type DVOData = {
    valuations: ValuationSignal[];
    positions: any[];
    candidates: any[];
};

export default function DVODashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [data, setData] = useState<DVOData>({ valuations: [], positions: [], candidates: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [valRes, posRes, candRes] = await Promise.all([
                fetch('/api/dvo/valuations'),
                fetch('/api/dvo/positions'),
                fetch('/api/dvo/candidates')
            ]);

            const valuations = await valRes.json();
            const positions = await posRes.json();
            const candidates = await candRes.json();

            setData({
                valuations: Array.isArray(valuations) ? valuations : [],
                positions: Array.isArray(positions) ? positions : [],
                candidates: Array.isArray(candidates) ? candidates : []
            });
        } catch (e) {
            console.error("Failed to fetch DVO data", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deep Value Overlay (DVO)</h1>
                    <p className="text-muted-foreground mt-2">
                        Portfolio-secured put selling on high-conviction undervalued assets.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        {loading ? <div className="animate-spin mr-2">C</div> : null}
                        Refresh Data
                    </Button>
                    <Button>Run Gravity Scan</Button>
                </div>
            </div>

            {/* Risk Disclosures */}
            <Alert variant="warning" className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-300">Strategy Risk: Portfolio Margin Required</AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    DVO uses significant leverage. Ensure you maintain &gt;$25k equity and monitor margin usage daily.
                    Assignment risk is real; be prepared to own the stock at the strike price.
                </AlertDescription>
            </Alert>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="valuations">Gravity Model</TabsTrigger>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active DVO Exposure</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${data.positions.reduce((acc, p) => acc + (p.current_value || 0), 0).toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">{data.positions.length} Positions</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">+$0.00</div>
                                <p className="text-xs text-muted-foreground">Coming soon</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Undervalued Signals</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.valuations.filter(v => v.margin_of_safety_pct > 0.20).length}</div>
                                <p className="text-xs text-muted-foreground">High Conviction (&gt;20% MoS)</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Candidates */}
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Top Valuation Candidates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.valuations.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">No valuation data available. Run a scan.</div>
                                ) : (
                                    data.valuations.slice(0, 5).map(val => (
                                        <div key={val.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/10 p-2 rounded-full font-bold w-12 text-center text-primary">
                                                    {val.symbol}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-lg">${val.current_price.toFixed(2)}</div>
                                                    <div className="text-sm text-muted-foreground">Fair Value: ${val.fair_value_price.toFixed(2)}</div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${val.margin_of_safety_pct > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {(val.margin_of_safety_pct * 100).toFixed(1)}% MoS
                                                </div>
                                                <Badge variant={val.regime_tag === 'UNDERVALUED' ? 'default' : 'secondary'}>
                                                    {val.regime_tag}
                                                </Badge>
                                            </div>

                                            <Button size="sm" variant="outline">Analyze</Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Valuations Tab */}
                <TabsContent value="valuations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gravity Valuation Model</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Full table of valuations here...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Strategy Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AutoApproveSettings />
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
