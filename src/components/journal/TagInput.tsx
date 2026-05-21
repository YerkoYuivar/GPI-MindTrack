import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView } from 'react-native';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';
import { colors } from '@theme/colors';

export type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[]; // estático: p.ej. ['gratitud','trabajo','familia','ansiedad']
  placeholder?: string; // default "Añadir etiqueta"
  className?: string;
};

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Añadir etiqueta',
  className,
}: TagInputProps) {
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const normalizedTags = value.map((t) => t.toLowerCase());

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputText.toLowerCase()) &&
      !normalizedTags.includes(s.toLowerCase()) &&
      inputText.trim().length > 0
  );

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !normalizedTags.includes(normalized)) {
      onChange([...value, normalized]);
      setInputText('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View className={className}>
      <Text className="text-sm font-medium text-gray-700 mb-2">Etiquetas</Text>

      {/* Campo de entrada y botón */}
      <View className="flex-row gap-2 mb-2">
        <View className="flex-1">
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              setShowSuggestions(text.trim().length > 0);
            }}
            placeholder={placeholder}
            className="border border-gray-300 rounded-md px-3 py-2 text-base"
            accessibilityLabel="Campo de etiqueta"
            onSubmitEditing={() => addTag(inputText)}
          />
        </View>
        <Button
          title="Añadir"
          onPress={() => addTag(inputText)}
          size="md"
          variant="secondary"
          disabled={!inputText.trim()}
        />
      </View>

      {/* Autocomplete suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {filteredSuggestions.map((suggestion, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => addTag(suggestion)}
                  className="bg-white border border-gray-300 rounded-full px-3 py-1"
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar etiqueta ${suggestion}`}
                >
                  <Text className="text-sm text-gray-700">{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tags chips */}
      {value.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {value.map((tag, index) => (
            <View
              key={index}
              className="bg-[#EEF2FF] border border-[#4F46E5] rounded-full px-3 py-1 flex-row items-center gap-2"
            >
              <Text className="text-sm text-[#4F46E5]">{tag}</Text>
              <Pressable
                onPress={() => removeTag(index)}
                className="w-5 h-5 rounded-full bg-[#4F46E5] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Eliminar etiqueta ${tag}`}
              >
                <Text className="text-xs text-white font-bold">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
