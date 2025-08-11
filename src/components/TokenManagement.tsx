import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface TokenManagementProps {
    apiToken: string;
    deeplToken: string;
    onApiTokenChange: (token: string) => void;
    onDeeplTokenChange: (token: string) => void;
    apiError?: string;
    synonymMode: 'replace' | 'smart-merge' | 'delete';
}

export const TokenManagement: React.FC<TokenManagementProps> = ({
    apiToken,
    deeplToken,
    onApiTokenChange,
    onDeeplTokenChange,
    apiError,
    synonymMode
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle> API-Token Konfiguration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="api-token">Wanikani API-Token *</Label>
                    <Input
                        id="api-token"
                        type="password"
                        placeholder="Geben Sie Ihren Wanikani API-Token ein..."
                        value={apiToken}
                        onChange={(e) => onApiTokenChange(e.target.value)}
                        className="font-mono"
                    />
                    <p className="text-sm text-gray-600">
                        Erforderlich für das Laden und Aktualisieren von Radicals
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="deepl-token">
                        DeepL API-Token {synonymMode === 'delete' ? '(optional - DELETE-Modus)' : '*'}
                    </Label>
                    <Input
                        id="deepl-token"
                        type="password"
                        placeholder="Geben Sie Ihren DeepL API-Token ein..."
                        value={deeplToken}
                        onChange={(e) => onDeeplTokenChange(e.target.value)}
                        className="font-mono"
                        disabled={synonymMode === 'delete'}
                    />
                    <p className="text-sm text-gray-600">
                        {synonymMode === 'delete' 
                            ? 'Nicht erforderlich im DELETE-Modus' 
                            : 'Erforderlich für die Übersetzung von Synonymen'}
                    </p>
                </div>

                {apiError && (
                    <Alert variant="destructive">
                        <AlertDescription>{apiError}</AlertDescription>
                    </Alert>
                )}

                {!apiToken && (
                    <Alert>
                        <AlertDescription>
                            <div className="space-y-2">
                                <p><strong> So erhalten Sie Ihren Wanikani API-Token:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                    <li>Besuchen Sie <a href="https://www.wanikani.com/settings/personal_access_tokens" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Wanikani API Tokens</a></li>
                                    <li>Klicken Sie auf "Generate a new token"</li>
                                    <li>Wählen Sie die Berechtigungen: "study_materials:create" und "study_materials:update"</li>
                                    <li>Klicken Sie auf "Generate token"</li>
                                    <li>Kopieren Sie den Token und fügen Sie ihn oben ein</li>
                                </ol>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};
