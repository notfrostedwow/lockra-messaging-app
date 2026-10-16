import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

interface CheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
  color?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onToggle,
  color = '#007AFF',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox, 
        checked && { backgroundColor: color, borderColor: color }
      ]}>
        {checked && <Check size={14} color="#FFFFFF" />}
      </View>
      <View style={styles.labelContainer}>
        {typeof label === 'string' ? (
          <Text style={styles.label}>{label}</Text>
        ) : (
          label
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#1F2937',
  },
}); 